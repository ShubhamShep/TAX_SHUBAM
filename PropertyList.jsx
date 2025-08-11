import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Calendar,
  Home
} from 'lucide-react';

export const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProperties, setFilteredProperties] = useState([]);

  const API_BASE = 'https://3dhkilceqm7z.manus.space/api';

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    // Filter properties based on search term
    const filtered = properties.filter(property =>
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.owner_name && property.owner_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProperties(filtered);
  }, [properties, searchTerm]);

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${API_BASE}/properties`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setProperties(data.properties || []);
      } else {
        console.error('Failed to fetch properties');
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatArea = (area) => {
    if (!area) return 'N/A';
    return `${area.toLocaleString()} sq ft`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading properties...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by address or owner name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No properties found' : 'No properties yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start surveying properties to see them here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="truncate">{property.address}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    #{property.id}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Owner Information */}
                {property.owner_name && (
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{property.owner_name}</span>
                  </div>
                )}
                
                {property.owner_phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{property.owner_phone}</span>
                  </div>
                )}
                
                {property.owner_email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 truncate">{property.owner_email}</span>
                  </div>
                )}

                {/* Property Details */}
                <div className="pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Area</p>
                      <p className="font-medium">{formatArea(property.area_sqft)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Survey Date</p>
                      <p className="font-medium">{formatDate(property.survey_date)}</p>
                    </div>
                  </div>
                </div>

                {/* Assessment Value */}
                {property.assessment_value && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-500">Assessment Value</p>
                    <p className="text-lg font-bold text-green-600">
                      ${property.assessment_value.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {property.notes && (
                  <div className="pt-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {property.notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 flex space-x-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Details
                  </Button>
                  <Button size="sm" className="flex-1">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredProperties.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Showing {filteredProperties.length} of {properties.length} properties
              </span>
              <span>
                Total surveyed area: {' '}
                {filteredProperties
                  .reduce((sum, prop) => sum + (prop.area_sqft || 0), 0)
                  .toLocaleString()} sq ft
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

