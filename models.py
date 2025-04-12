from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_investor = db.Column(db.Boolean, default=True)  # True for investors, False for farm managers
    total_investment = db.Column(db.Float, default=0.0)
    
    # Relationships
    investments = db.relationship('Investment', backref='investor', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Farm(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    location = db.Column(db.String(256))
    description = db.Column(db.Text)
    farm_type = db.Column(db.String(64))  # e.g., "Crop", "Livestock", "Mixed"
    size_hectares = db.Column(db.Float)
    established_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Financial metrics
    total_funding_needed = db.Column(db.Float, default=0.0)
    current_funding = db.Column(db.Float, default=0.0)
    expected_roi = db.Column(db.Float)  # Percentage
    risk_level = db.Column(db.String(20))  # "Low", "Medium", "High"
    
    # Farm performance
    yield_history = db.Column(db.Text)  # Stored as JSON string
    
    # Relationships
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    investment_opportunities = db.relationship('InvestmentOpportunity', backref='farm', lazy='dynamic')
    performance_data = db.relationship('FarmPerformance', backref='farm', lazy='dynamic')
    
    def funding_percentage(self):
        if self.total_funding_needed == 0:
            return 0
        return (self.current_funding / self.total_funding_needed) * 100
    
    def __repr__(self):
        return f'<Farm {self.name}>'


class InvestmentOpportunity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farm.id'), nullable=False)
    title = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    amount_needed = db.Column(db.Float, nullable=False)
    amount_raised = db.Column(db.Float, default=0.0)
    minimum_investment = db.Column(db.Float, default=0.0)
    expected_roi = db.Column(db.Float)  # Percentage
    duration_months = db.Column(db.Integer)  # Investment duration in months
    risk_level = db.Column(db.String(20))  # "Low", "Medium", "High"
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="Open")  # "Open", "Closed", "Completed"
    
    # Relationships
    investments = db.relationship('Investment', backref='opportunity', lazy='dynamic')
    
    def funding_percentage(self):
        if self.amount_needed == 0:
            return 0
        return (self.amount_raised / self.amount_needed) * 100
    
    def __repr__(self):
        return f'<InvestmentOpportunity {self.title}>'


class Investment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('investment_opportunity.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date_invested = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="Active")  # "Active", "Completed", "Cancelled"
    
    def __repr__(self):
        return f'<Investment {self.id} of {self.amount}>'


class FarmPerformance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farm.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    yield_amount = db.Column(db.Float)  # e.g., tons of crops or livestock count
    revenue = db.Column(db.Float)
    expenses = db.Column(db.Float)
    profit = db.Column(db.Float)
    weather_conditions = db.Column(db.String(128))
    notes = db.Column(db.Text)
    
    def profit_margin(self):
        if self.revenue == 0:
            return 0
        return (self.profit / self.revenue) * 100
    
    def __repr__(self):
        return f'<FarmPerformance {self.date}>'
