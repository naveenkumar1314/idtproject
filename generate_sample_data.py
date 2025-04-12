"""
Script to generate sample data for the Smart Agri Investment platform
This will create farms, investment opportunities, and farm performance data for analytics
"""

import os
import sys
import random
from datetime import datetime, timedelta
import math

# Add the current directory to the path so we can import the app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User, Farm, InvestmentOpportunity, Investment, FarmPerformance


def generate_sample_data():
    """Generate sample data for analytics and visualization"""
    with app.app_context():
        print("Generating sample data for analytics...")
        
        # Delete existing data
        print("Clearing existing performance data...")
        FarmPerformance.query.delete()
        Investment.query.delete()
        InvestmentOpportunity.query.delete()
        Farm.query.delete()
        
        # Create admin user if it doesn't exist
        admin = User.query.filter_by(username="admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                first_name="Admin",
                last_name="User",
                is_investor=False
            )
            admin.set_password("password")
            db.session.add(admin)
            print("Created admin user")
        
        # Create investor user if it doesn't exist
        investor = User.query.filter_by(username="investor").first()
        if not investor:
            investor = User(
                username="investor",
                email="investor@example.com",
                first_name="Test",
                last_name="Investor",
                is_investor=True
            )
            investor.set_password("password")
            db.session.add(investor)
            print("Created investor user")
        
        db.session.commit()
        
        # Create sample farms
        farms = []
        farm_types = ["Crop", "Livestock", "Mixed"]
        risk_levels = ["Low", "Medium", "High"]
        
        farm_data = [
            {
                "name": "Green Valley Crops",
                "location": "California, USA",
                "description": "Sustainable crop farm specializing in organic vegetables and fruits.",
                "farm_type": "Crop",
                "size_hectares": 120.5,
                "established_date": datetime(2018, 5, 15).date(),
                "total_funding_needed": 500000.0,
                "current_funding": 320000.0,
                "expected_roi": 12.5,
                "risk_level": "Low",
                "owner_id": admin.id
            },
            {
                "name": "Highland Cattle Ranch",
                "location": "Montana, USA",
                "description": "Premium cattle ranch producing high-quality beef with sustainable practices.",
                "farm_type": "Livestock",
                "size_hectares": 850.0,
                "established_date": datetime(2015, 3, 22).date(),
                "total_funding_needed": 750000.0,
                "current_funding": 420000.0,
                "expected_roi": 14.2,
                "risk_level": "Medium",
                "owner_id": admin.id
            },
            {
                "name": "Sunrise Diversified Farm",
                "location": "Iowa, USA",
                "description": "Mixed farming operation with crops and dairy cattle. Focuses on sustainable ecosystem.",
                "farm_type": "Mixed",
                "size_hectares": 350.0,
                "established_date": datetime(2019, 8, 10).date(),
                "total_funding_needed": 600000.0,
                "current_funding": 250000.0,
                "expected_roi": 15.8,
                "risk_level": "Medium",
                "owner_id": admin.id
            },
            {
                "name": "Organic Valley Farms",
                "location": "Oregon, USA",
                "description": "Family-owned organic farm specializing in a variety of certified organic crops.",
                "farm_type": "Crop",
                "size_hectares": 200.0,
                "established_date": datetime(2017, 2, 28).date(),
                "total_funding_needed": 450000.0,
                "current_funding": 380000.0,
                "expected_roi": 11.2,
                "risk_level": "Low",
                "owner_id": admin.id
            },
            {
                "name": "Prairie Poultry & Grains",
                "location": "Kansas, USA",
                "description": "Modern farm combining poultry production with grain cultivation.",
                "farm_type": "Mixed",
                "size_hectares": 275.0,
                "established_date": datetime(2016, 6, 5).date(),
                "total_funding_needed": 550000.0,
                "current_funding": 290000.0,
                "expected_roi": 16.5,
                "risk_level": "High",
                "owner_id": admin.id
            }
        ]
        
        for farm_info in farm_data:
            farm = Farm(**farm_info)
            db.session.add(farm)
            farms.append(farm)
        
        db.session.commit()
        print(f"Created {len(farms)} sample farms")
        
        # Create investment opportunities for each farm
        opportunities = []
        for farm in farms:
            # Create 1-3 opportunities per farm
            num_opportunities = random.randint(1, 3)
            
            for i in range(num_opportunities):
                # Calculate amount needed as a portion of total funding
                portion = random.uniform(0.15, 0.4)
                amount_needed = farm.total_funding_needed * portion
                amount_raised = amount_needed * random.uniform(0.1, 0.8)
                
                opportunity = InvestmentOpportunity(
                    farm_id=farm.id,
                    title=f"{farm.name} - Project {i+1}",
                    description=f"Investment opportunity for {farm.name}. Phase {i+1} of farm development.",
                    amount_needed=amount_needed,
                    amount_raised=amount_raised,
                    minimum_investment=amount_needed * 0.05,
                    expected_roi=farm.expected_roi + random.uniform(-2.0, 2.0),
                    duration_months=random.choice([12, 24, 36, 48]),
                    risk_level=farm.risk_level,
                    start_date=datetime.now().date(),
                    end_date=(datetime.now() + timedelta(days=365)).date(),
                    status="Open"
                )
                db.session.add(opportunity)
                opportunities.append(opportunity)
        
        db.session.commit()
        print(f"Created {len(opportunities)} investment opportunities")
        
        # Create some investments for the investor
        for i in range(min(5, len(opportunities))):
            opportunity = opportunities[i]
            amount = opportunity.minimum_investment * random.uniform(1.0, 3.0)
            
            investment = Investment(
                user_id=investor.id,
                opportunity_id=opportunity.id,
                amount=amount,
                date_invested=datetime.now() - timedelta(days=random.randint(10, 100)),
                status="Active"
            )
            
            db.session.add(investment)
            
            # Update amounts
            opportunity.amount_raised += amount
            opportunity.farm.current_funding += amount
            investor.total_investment += amount
            
        db.session.commit()
        print(f"Created investments for the investor")
        
        # Generate farm performance data for each farm
        for farm in farms:
            # Generate 24 months of data
            start_date = datetime.now() - timedelta(days=730)  # 2 years ago
            
            weather_conditions = ["Sunny", "Cloudy", "Rainy", "Storm", "Drought", "Ideal", "Cold", "Hot"]
            
            base_yield = random.uniform(10.0, 50.0)  # Base yield in tons
            base_revenue = random.uniform(20000.0, 100000.0)  # Base monthly revenue
            base_expense = base_revenue * random.uniform(0.4, 0.7)  # Base monthly expenses
            
            # Growth factors for seasonal variations
            monthly_growth_factor = [
                0.8,  # January
                0.85, # February
                0.95, # March
                1.1,  # April
                1.2,  # May
                1.3,  # June
                1.25, # July
                1.2,  # August
                1.1,  # September
                1.0,  # October
                0.9,  # November
                0.85  # December
            ]
            
            # Create 24 monthly performance records
            for i in range(24):
                current_date = (start_date + timedelta(days=30*i)).date()
                month_index = current_date.month - 1
                
                # Add seasonality factor
                season_factor = monthly_growth_factor[month_index]
                
                # Add some randomness
                random_factor = random.uniform(0.85, 1.15)
                
                # Determine weather condition
                weather = random.choice(weather_conditions)
                
                # Weather impact on yield
                weather_impact = {
                    "Sunny": 1.1,
                    "Cloudy": 0.9,
                    "Rainy": 0.8,
                    "Storm": 0.6,
                    "Drought": 0.5,
                    "Ideal": 1.2,
                    "Cold": 0.7,
                    "Hot": 0.85
                }.get(weather, 1.0)
                
                # Calculate yield with seasonal and weather effects
                current_yield = base_yield * season_factor * random_factor * weather_impact
                
                # Calculate revenue based on yield
                current_revenue = base_revenue * season_factor * random_factor
                
                # Expenses are more stable but still vary
                expense_factor = random.uniform(0.9, 1.1)
                current_expenses = base_expense * expense_factor
                
                # Calculate profit
                current_profit = current_revenue - current_expenses
                
                # Create performance record
                performance = FarmPerformance(
                    farm_id=farm.id,
                    date=current_date,
                    yield_amount=round(current_yield, 2),
                    revenue=round(current_revenue, 2),
                    expenses=round(current_expenses, 2),
                    profit=round(current_profit, 2),
                    weather_conditions=weather,
                    notes=f"Monthly performance record for {current_date.strftime('%B %Y')}"
                )
                
                db.session.add(performance)
            
            # Add a trend factor for farm development over time
            base_yield *= 1.2
            base_revenue *= 1.25
            base_expense *= 1.15  # Expenses grow slower than revenue
                
        db.session.commit()
        print("Generated farm performance data")
        
        print("Sample data generation complete!")


if __name__ == "__main__":
    generate_sample_data()