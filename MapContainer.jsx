import { useState, useEffect, useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, useMapEvents, Marker, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PropertyForm } from './PropertyForm';
import { 
  Square, 
  Trash2, 
  Save, 
  RotateCcw,
  MapPin,
  FileText,
  Ruler
} from 'lucide-react';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom marker icons for drawing points
const createNumberedIcon = (number) => {
  return L.divIcon({
    className: 'custom-numbered-marker',
    html: `<div style="
      background-color: #ef4444;
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    ">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Create icon for completed polygon markers
const completedPolygonIcon = L.divIcon({
  className: 'custom-completed-marker',
  html: `<div style="
    background-color: #dc2626;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const DrawingHandler = ({ isDrawing, onPointAdd, onFinishDrawing }) => {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onPointAdd([e.latlng.lat, e.latlng.lng]);
      }
    },
    dblclick: (e) => {
      if (isDrawing) {
        e.originalEvent.preventDefault();
        onFinishDrawing();
      }
    }
  });
  return null;
};

export const MapContainer = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [completedPolygons, setCompletedPolygons] = useState([]);
  const [storedPolygons, setStoredPolygons] = useState([]); // Add stored polygons from database
  const [area, setArea] = useState(0);
  const [perimeter, setPerimeter] = useState(0);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [distances, setDistances] = useState([]);
  const mapRef = useRef();
  const polygonLayerRef = useRef();

  const API_BASE = 'https://nghki1cz8d0p.manus.space/api';

  // Load stored polygons from backend on component mount
  useEffect(() => {
    loadStoredPolygons();
  }, []);

  const loadStoredPolygons = async () => {
    try {
      const response = await fetch(`${API_BASE}/properties`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const polygonsWithCoords = data.properties
          .filter(prop => prop.polygon_coordinates && prop.polygon_coordinates.length > 0)
          .map(prop => ({
            id: prop.id,
            coordinates: prop.polygon_coordinates,
            area: prop.area_sqft,
            address: prop.address,
            owner_name: prop.owner_name,
            stored: true
          }));
        setStoredPolygons(polygonsWithCoords);
      }
    } catch (error) {
      console.error('Failed to load stored polygons:', error);
    }
  };

  useEffect(() => {
    if (mapRef.current && !polygonLayerRef.current) {
      polygonLayerRef.current = L.layerGroup().addTo(mapRef.current);
    }
  }, []);

  // Calculate distance between two points in meters
  const calculateDistance = (point1, point2) => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = point1[0] * Math.PI / 180;
    const lat2 = point2[0] * Math.PI / 180;
    const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
    const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Calculate area using geodesic calculations
  const calculateArea = (coordinates) => {
    if (coordinates.length < 3) return 0;
    
    // Convert to meters using Haversine formula for more accurate area calculation
    let area = 0;
    const n = coordinates.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const lat1 = coordinates[i][0] * Math.PI / 180;
      const lat2 = coordinates[j][0] * Math.PI / 180;
      const lng1 = coordinates[i][1] * Math.PI / 180;
      const lng2 = coordinates[j][1] * Math.PI / 180;
      
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    area = Math.abs(area) * 6378137 * 6378137 / 2; // Earth's radius squared
    
    // Convert to square feet
    const sqFeet = area * 10.764;
    return sqFeet;
  };

  // Calculate perimeter
  const calculatePerimeter = (coordinates) => {
    if (coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    const distances = [];
    
    for (let i = 0; i < coordinates.length; i++) {
      const nextIndex = (i + 1) % coordinates.length;
      const distance = calculateDistance(coordinates[i], coordinates[nextIndex]);
      distances.push(distance);
      totalDistance += distance;
    }
    
    return { total: totalDistance, segments: distances };
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
    setArea(0);
    setPerimeter(0);
    setDistances([]);
  };

  const addPoint = (point) => {
    const newPolygon = [...currentPolygon, point];
    setCurrentPolygon(newPolygon);
    
    // Calculate measurements
    if (newPolygon.length > 2) {
      const calculatedArea = calculateArea(newPolygon);
      setArea(calculatedArea);
    }
    
    if (newPolygon.length > 1) {
      const perimeterData = calculatePerimeter(newPolygon);
      setPerimeter(perimeterData.total);
      setDistances(perimeterData.segments);
    }
    
    // Update the drawing on the map
    if (polygonLayerRef.current && mapRef.current) {
      polygonLayerRef.current.clearLayers();
      
      // Draw current polygon
      if (newPolygon.length > 0) {
        // Draw points with enhanced styling
        newPolygon.forEach((point, index) => {
          const marker = L.circleMarker(point, {
            radius: 6,
            fillColor: '#EF4444',
            color: '#FFFFFF',
            weight: 2,
            fillOpacity: 1
          });
          
          // Add point number label
          const label = L.divIcon({
            className: 'point-label',
            html: `<div style="background: #EF4444; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white;">${index + 1}</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          
          const labelMarker = L.marker(point, { icon: label });
          polygonLayerRef.current.addLayer(marker);
          polygonLayerRef.current.addLayer(labelMarker);
        });
        
        // Draw lines with distance labels
        if (newPolygon.length > 1) {
          for (let i = 0; i < newPolygon.length - 1; i++) {
            const line = L.polyline([newPolygon[i], newPolygon[i + 1]], {
              color: '#3B82F6',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5'
            });
            polygonLayerRef.current.addLayer(line);
            
            // Add distance label
            const midpoint = [
              (newPolygon[i][0] + newPolygon[i + 1][0]) / 2,
              (newPolygon[i][1] + newPolygon[i + 1][1]) / 2
            ];
            
            const distance = calculateDistance(newPolygon[i], newPolygon[i + 1]);
            const distanceLabel = L.divIcon({
              className: 'distance-label',
              html: `<div style="background: rgba(59, 130, 246, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap;">${(distance * 3.28084).toFixed(1)} ft</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            });
            
            const distanceMarker = L.marker(midpoint, { icon: distanceLabel });
            polygonLayerRef.current.addLayer(distanceMarker);
          }
          
          // Draw closing line if we have enough points for a polygon
          if (newPolygon.length > 2) {
            const closingLine = L.polyline([newPolygon[newPolygon.length - 1], newPolygon[0]], {
              color: '#3B82F6',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5'
            });
            polygonLayerRef.current.addLayer(closingLine);
            
            // Add closing distance label
            const midpoint = [
              (newPolygon[newPolygon.length - 1][0] + newPolygon[0][0]) / 2,
              (newPolygon[newPolygon.length - 1][1] + newPolygon[0][1]) / 2
            ];
            
            const distance = calculateDistance(newPolygon[newPolygon.length - 1], newPolygon[0]);
            const distanceLabel = L.divIcon({
              className: 'distance-label',
              html: `<div style="background: rgba(59, 130, 246, 0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap;">${(distance * 3.28084).toFixed(1)} ft</div>`,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            });
            
            const distanceMarker = L.marker(midpoint, { icon: distanceLabel });
            polygonLayerRef.current.addLayer(distanceMarker);
          }
        }
        
        // Draw semi-transparent polygon preview if we have enough points
        if (newPolygon.length > 2) {
          const polygon = L.polygon(newPolygon, {
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.8
          });
          polygonLayerRef.current.addLayer(polygon);
        }
      }
      
      // Draw completed polygons
      completedPolygons.forEach((poly, index) => {
        const polygon = L.polygon(poly.coordinates, {
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.3,
          weight: 2
        });
        polygonLayerRef.current.addLayer(polygon);
        
        // Add area label for completed polygons
        const center = polygon.getBounds().getCenter();
        const areaLabel = L.divIcon({
          className: 'area-label',
          html: `<div style="background: rgba(16, 185, 129, 0.9); color: white; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; text-align: center;">${poly.area.toLocaleString()} sq ft</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0]
        });
        
        const areaMarker = L.marker(center, { icon: areaLabel });
        polygonLayerRef.current.addLayer(areaMarker);
      });
    }
  };

  const finishDrawing = () => {
    if (currentPolygon.length > 2) {
      const newCompletedPolygon = {
        id: Date.now(),
        coordinates: currentPolygon,
        area: calculateArea(currentPolygon),
        perimeter: calculatePerimeter(currentPolygon).total
      };
      setCompletedPolygons([...completedPolygons, newCompletedPolygon]);
    }
    
    setIsDrawing(false);
    setCurrentPolygon([]);
    setArea(0);
    setPerimeter(0);
    setDistances([]);
  };

  const clearAll = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
    setCompletedPolygons([]);
    setArea(0);
    setPerimeter(0);
    setDistances([]);
    
    if (polygonLayerRef.current) {
      polygonLayerRef.current.clearLayers();
    }
  };

  const undoLastPoint = () => {
    if (currentPolygon.length > 0) {
      const newPolygon = currentPolygon.slice(0, -1);
      setCurrentPolygon(newPolygon);
      
      // Recalculate measurements
      if (newPolygon.length > 2) {
        const calculatedArea = calculateArea(newPolygon);
        setArea(calculatedArea);
      } else {
        setArea(0);
      }
      
      if (newPolygon.length > 1) {
        const perimeterData = calculatePerimeter(newPolygon);
        setPerimeter(perimeterData.total);
        setDistances(perimeterData.segments);
      } else {
        setPerimeter(0);
        setDistances([]);
      }
      
      // Redraw
      if (polygonLayerRef.current) {
        polygonLayerRef.current.clearLayers();
        if (newPolygon.length > 0) {
          // Simulate adding the last point to trigger redraw
          const lastPoint = newPolygon[newPolygon.length - 1];
          setCurrentPolygon(newPolygon.slice(0, -1));
          setTimeout(() => addPoint(lastPoint), 0);
        }
      }
    }
  };

  const openPropertyForm = (polygon) => {
    setSelectedPolygon(polygon);
    setShowPropertyForm(true);
  };

  const handlePropertySave = async (savedProperty) => {
    // Remove the saved polygon from completed polygons
    setCompletedPolygons(prev => prev.filter(p => p.id !== selectedPolygon.id));
    
    // Reload stored polygons from backend to include the newly saved one
    await loadStoredPolygons();
    
    // Show success message
    alert('Property saved successfully!');
  };

  return (
    <div className="h-full relative">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-[1000] space-y-2">
        <Card className="p-3 shadow-lg">
          <div className="flex flex-col space-y-3">
            <div className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
              <Ruler className="w-4 h-4" />
              <span>Survey Tools</span>
            </div>
            
            <Button
              onClick={startDrawing}
              disabled={isDrawing}
              size="sm"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <Square className="w-4 h-4" />
              <span>Draw Property</span>
            </Button>
            
            {isDrawing && (
              <>
                <Button
                  onClick={finishDrawing}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Finish</span>
                </Button>
                
                <Button
                  onClick={undoLastPoint}
                  size="sm"
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Undo Point</span>
                </Button>
              </>
            )}
            
            <Button
              onClick={clearAll}
              size="sm"
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Real-time Measurements Display */}
      {(isDrawing && currentPolygon.length > 0) && (
        <div className="absolute top-4 right-4 z-[1000]">
          <Card className="p-4 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-blue-800 flex items-center space-x-2">
                <Ruler className="w-4 h-4" />
                <span>Live Measurements</span>
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Points:</p>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {currentPolygon.length}
                  </Badge>
                </div>
                
                {perimeter > 0 && (
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Perimeter:</p>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {(perimeter * 3.28084).toFixed(1)} ft
                    </Badge>
                  </div>
                )}
                
                {area > 0 && (
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Area:</p>
                    <Badge className="bg-blue-600 text-white text-base font-bold">
                      {area.toLocaleString()} sq ft
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Completed Properties Display */}
      {completedPolygons.length > 0 && !isDrawing && (
        <div className="absolute top-4 right-4 z-[1000]">
          <Card className="p-4 shadow-lg">
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700">Surveyed Properties:</div>
              <div className="space-y-2">
                {completedPolygons.map((poly, index) => (
                  <div key={poly.id} className="flex items-center justify-between space-x-3 p-2 bg-green-50 rounded-lg">
                    <div className="flex-1">
                      <Badge className="bg-green-600 text-white mb-1">
                        {poly.area.toLocaleString()} sq ft
                      </Badge>
                      <p className="text-xs text-green-700">
                        Perimeter: {(poly.perimeter * 3.28084).toFixed(1)} ft
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPropertyForm(poly)}
                      className="h-8 px-3 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Enhanced Drawing Instructions */}
      {isDrawing && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000]">
          <Card className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
            <div className="text-center space-y-2">
              <p className="font-semibold">🏠 Surveying Property</p>
              <p className="text-sm opacity-90">
                Click around the house perimeter • Double-click to complete
              </p>
              {currentPolygon.length > 0 && (
                <p className="text-xs opacity-75">
                  {currentPolygon.length} point{currentPolygon.length !== 1 ? 's' : ''} placed
                  {currentPolygon.length >= 3 ? ' • Ready to finish' : ` • Need ${3 - currentPolygon.length} more`}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Leaflet Map */}
      <LeafletMapContainer
        center={[40.7128, -74.0060]} // Default to NYC
        zoom={18}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render drawing points with numbered markers */}
        {currentPolygon.map((point, index) => (
          <Marker
            key={`drawing-point-${index}`}
            position={point}
            icon={createNumberedIcon(index + 1)}
          />
        ))}
        
        {/* Render connecting lines during drawing */}
        {currentPolygon.length > 1 && (
          <Polyline
            positions={currentPolygon}
            color="#3B82F6"
            weight={3}
            opacity={0.8}
            dashArray="5, 5"
          />
        )}
        
        {/* Render closing line for polygon preview */}
        {currentPolygon.length > 2 && (
          <Polyline
            positions={[currentPolygon[currentPolygon.length - 1], currentPolygon[0]]}
            color="#3B82F6"
            weight={3}
            opacity={0.8}
            dashArray="5, 5"
          />
        )}
        
        {/* Render semi-transparent polygon preview during drawing */}
        {currentPolygon.length > 2 && (
          <Polygon
            positions={currentPolygon}
            color="#3B82F6"
            fillColor="#3B82F6"
            fillOpacity={0.15}
            weight={2}
            opacity={0.8}
          />
        )}
        
        {/* Render completed polygons in red */}
        {completedPolygons.map((poly) => (
          <div key={`completed-${poly.id}`}>
            <Polygon
              positions={poly.coordinates}
              color="#DC2626"
              fillColor="#DC2626"
              fillOpacity={0.3}
              weight={3}
              opacity={1}
            />
            {/* Add markers for completed polygon vertices */}
            {poly.coordinates.map((point, index) => (
              <Marker
                key={`completed-point-${poly.id}-${index}`}
                position={point}
                icon={completedPolygonIcon}
              />
            ))}
          </div>
        ))}
        
        {/* Render stored polygons from database in green */}
        {storedPolygons.map((poly) => (
          <div key={`stored-${poly.id}`}>
            <Polygon
              positions={poly.coordinates}
              color="#059669"
              fillColor="#059669"
              fillOpacity={0.25}
              weight={2}
              opacity={1}
            />
            {/* Add markers for stored polygon vertices */}
            {poly.coordinates.map((point, index) => (
              <Marker
                key={`stored-point-${poly.id}-${index}`}
                position={point}
                icon={L.divIcon({
                  className: 'custom-stored-marker',
                  html: `<div style="
                    background-color: #059669;
                    color: white;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  "></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                })}
              />
            ))}
          </div>
        ))}
        
        <DrawingHandler
          isDrawing={isDrawing}
          onPointAdd={addPoint}
          onFinishDrawing={finishDrawing}
        />
      </LeafletMapContainer>

      {/* Property Form Modal */}
      <PropertyForm
        isOpen={showPropertyForm}
        onClose={() => setShowPropertyForm(false)}
        polygonData={selectedPolygon}
        onSave={handlePropertySave}
      />
    </div>
  );
};

