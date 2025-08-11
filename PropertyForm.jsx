import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  DollarSign,
  FileText,
  Save,
  X
} from 'lucide-react';

export const PropertyForm = ({ 
  isOpen, 
  onClose, 
  polygonData, 
  onSave 
}) => {
  const [formData, setFormData] = useState({
    address: '',
    owner_name: '',
    owner_phone: '',
    owner_email: '',
    assessment_value: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = 'https://nghki1cz8d0p.manus.space/api';

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.address.trim()) {
      setError('Address is required');
      setLoading(false);
      return;
    }

    try {
      const propertyData = {
        ...formData,
        polygon_coordinates: polygonData.coordinates,
        area_sqft: polygonData.area,
        assessment_value: formData.assessment_value ? parseFloat(formData.assessment_value) : null
      };

      const response = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(propertyData),
      });

      const data = await response.json();

      if (response.ok) {
        onSave(data.property);
        onClose();
        // Reset form
        setFormData({
          address: '',
          owner_name: '',
          owner_phone: '',
          owner_email: '',
          assessment_value: '',
          notes: ''
        });
      } else {
        setError(data.error || 'Failed to save property');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span>Property Information</span>
              </CardTitle>
              <CardDescription>
                Enter property details and owner information
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Polygon Summary */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Survey Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Area:</span>
                <span className="ml-2 font-medium">
                  {polygonData.area.toLocaleString()} sq ft
                </span>
              </div>
              <div>
                <span className="text-blue-700">Points:</span>
                <span className="ml-2 font-medium">
                  {polygonData.coordinates.length} coordinates
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Property Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Property Address *</span>
              </Label>
              <Input
                id="address"
                name="address"
                type="text"
                placeholder="Enter the property address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            {/* Owner Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Owner Information</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    name="owner_name"
                    type="text"
                    placeholder="Full name"
                    value={formData.owner_name}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Phone Number</Label>
                  <Input
                    id="owner_phone"
                    name="owner_phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.owner_phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner_email">Email Address</Label>
                <Input
                  id="owner_email"
                  name="owner_email"
                  type="email"
                  placeholder="owner@example.com"
                  value={formData.owner_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Assessment Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Assessment Information</span>
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="assessment_value">Assessment Value ($)</Label>
                <Input
                  id="assessment_value"
                  name="assessment_value"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.assessment_value}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Notes</span>
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes about the property..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Save Property</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

