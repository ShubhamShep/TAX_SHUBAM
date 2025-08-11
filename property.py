from src.models.user import db
from datetime import datetime
import json

class Property(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    address = db.Column(db.String(200), nullable=False)
    owner_name = db.Column(db.String(100))
    owner_phone = db.Column(db.String(20))
    owner_email = db.Column(db.String(120))
    polygon_coordinates = db.Column(db.Text)  # JSON string of lat/lng coordinates
    area_sqft = db.Column(db.Float)
    assessment_value = db.Column(db.Float)
    surveyor_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    survey_date = db.Column(db.DateTime)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_polygon_coordinates(self, coordinates):
        """Set polygon coordinates as JSON string"""
        self.polygon_coordinates = json.dumps(coordinates)

    def get_polygon_coordinates(self):
        """Get polygon coordinates as Python object"""
        if self.polygon_coordinates:
            return json.loads(self.polygon_coordinates)
        return None

    def __repr__(self):
        return f'<Property {self.address}>'

    def to_dict(self):
        return {
            'id': self.id,
            'address': self.address,
            'owner_name': self.owner_name,
            'owner_phone': self.owner_phone,
            'owner_email': self.owner_email,
            'polygon_coordinates': self.get_polygon_coordinates(),
            'area_sqft': self.area_sqft,
            'assessment_value': self.assessment_value,
            'surveyor_id': self.surveyor_id,
            'survey_date': self.survey_date.isoformat() if self.survey_date else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

