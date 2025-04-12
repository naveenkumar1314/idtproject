from flask import render_template, redirect, url_for, flash, request, jsonify, abort
from flask_login import login_user, logout_user, current_user, login_required
from datetime import datetime, date
import json
import math
import numpy as np
import pandas as pd
from app import app, db
from models import User, Farm, InvestmentOpportunity, Investment, FarmPerformance


@app.route('/')
def index():
    """Home page route"""
    # Get featured farms
    featured_farms = Farm.query.order_by(Farm.created_at.desc()).limit(3).all()
    
    # Get open investment opportunities
    opportunities = InvestmentOpportunity.query.filter_by(status="Open").order_by(InvestmentOpportunity.created_at.desc()).limit(4).all()
    
    return render_template('index.html', 
                          featured_farms=featured_farms, 
                          opportunities=opportunities)


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login route"""
    if current_user.is_authenticated:
        return redirect(url_for('investor_dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user is None or not user.check_password(password):
            flash('Invalid username or password', 'danger')
            return redirect(url_for('login'))
        
        login_user(user, remember=True)
        next_page = request.args.get('next')
        
        if not next_page or not next_page.startswith('/'):
            next_page = url_for('investor_dashboard')
            
        flash('Login successful!', 'success')
        return redirect(next_page)
    
    return render_template('auth/login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration route"""
    if current_user.is_authenticated:
        return redirect(url_for('investor_dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        first_name = request.form.get('first_name')
        last_name = request.form.get('last_name')
        
        # Form validation
        if password != confirm_password:
            flash('Passwords do not match', 'danger')
            return redirect(url_for('register'))
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists', 'danger')
            return redirect(url_for('register'))
            
        if User.query.filter_by(email=email).first():
            flash('Email already registered', 'danger')
            return redirect(url_for('register'))
        
        # Create new user
        user = User(username=username, email=email, first_name=first_name, last_name=last_name)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))
    
    return render_template('auth/register.html')


@app.route('/logout')
@login_required
def logout():
    """User logout route"""
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))


@app.route('/dashboard')
@login_required
def investor_dashboard():
    """Investor dashboard route"""
    # Get user investments
    investments = Investment.query.filter_by(user_id=current_user.id).all()
    
    # Calculate total invested amount
    total_invested = sum(investment.amount for investment in investments)
    
    # Get investment opportunities the user has invested in
    investment_opportunities = []
    for investment in investments:
        opportunity = investment.opportunity
        farm = opportunity.farm
        investment_opportunities.append({
            'id': opportunity.id,
            'title': opportunity.title,
            'farm_name': farm.name,
            'amount_invested': investment.amount,
            'expected_roi': opportunity.expected_roi,
            'status': investment.status,
            'date_invested': investment.date_invested
        })
    
    # Get performance data for chart
    performance_data = []
    for investment in investments:
        opportunity = investment.opportunity
        farm = opportunity.farm
        farm_performances = FarmPerformance.query.filter_by(farm_id=farm.id).order_by(FarmPerformance.date).all()
        
        if farm_performances:
            performance_data.append({
                'farm_name': farm.name,
                'dates': [performance.date.strftime('%Y-%m-%d') for performance in farm_performances],
                'profits': [performance.profit for performance in farm_performances],
                'revenues': [performance.revenue for performance in farm_performances],
                'expenses': [performance.expenses for performance in farm_performances]
            })
    
    return render_template('dashboard/investor.html', 
                          investments=investment_opportunities,
                          total_invested=total_invested,
                          performance_data=json.dumps(performance_data))

@app.route('/analytics')
@login_required
def analytics_dashboard():
    """Analytics dashboard route with dynamic charts"""
    # Get all farms for the filter dropdown
    farms = Farm.query.all()
    
    # Get all investment opportunities
    opportunities = InvestmentOpportunity.query.all()
    
    # Group opportunities by farm for easy filtering
    farm_opportunities = {}
    for opportunity in opportunities:
        if opportunity.farm_id not in farm_opportunities:
            farm_opportunities[opportunity.farm_id] = []
        farm_opportunities[opportunity.farm_id].append({
            'id': opportunity.id,
            'title': opportunity.title
        })
    
    return render_template('dashboard/analytics.html',
                          farms=farms,
                          farm_opportunities=json.dumps(farm_opportunities))


@app.route('/farms')
def farms():
    """List all farms"""
    all_farms = Farm.query.all()
    return render_template('farms.html', farms=all_farms)


@app.route('/farm/<int:farm_id>')
def farm_detail(farm_id):
    """Farm detail page"""
    farm = Farm.query.get_or_404(farm_id)
    
    # Get farm performance data for charts
    performances = FarmPerformance.query.filter_by(farm_id=farm_id).order_by(FarmPerformance.date).all()
    
    performance_data = {
        'dates': [performance.date.strftime('%Y-%m-%d') for performance in performances],
        'profits': [performance.profit for performance in performances],
        'revenues': [performance.revenue for performance in performances],
        'expenses': [performance.expenses for performance in performances],
        'yields': [performance.yield_amount for performance in performances]
    }
    
    # Get active investment opportunities
    opportunities = InvestmentOpportunity.query.filter_by(farm_id=farm_id, status="Open").all()
    
    return render_template('dashboard/farm_detail.html', 
                          farm=farm,
                          performance_data=json.dumps(performance_data),
                          opportunities=opportunities)


@app.route('/opportunities')
def investment_opportunities():
    """List all investment opportunities"""
    # Get filter parameters
    farm_type = request.args.get('farm_type')
    risk_level = request.args.get('risk_level')
    min_roi = request.args.get('min_roi', type=float)
    max_investment = request.args.get('max_investment', type=float)
    
    # Base query
    query = InvestmentOpportunity.query.filter_by(status="Open").join(Farm)
    
    # Apply filters
    if farm_type:
        query = query.filter(Farm.farm_type == farm_type)
    if risk_level:
        query = query.filter(InvestmentOpportunity.risk_level == risk_level)
    if min_roi:
        query = query.filter(InvestmentOpportunity.expected_roi >= min_roi)
    if max_investment:
        query = query.filter(InvestmentOpportunity.minimum_investment <= max_investment)
    
    opportunities = query.all()
    
    # Get unique farm types and risk levels for filters
    farm_types = db.session.query(Farm.farm_type).distinct().all()
    risk_levels = db.session.query(InvestmentOpportunity.risk_level).distinct().all()
    
    return render_template('investments/opportunities.html', 
                          opportunities=opportunities,
                          farm_types=[ft[0] for ft in farm_types],
                          risk_levels=[rl[0] for rl in risk_levels])


@app.route('/invest/<int:opportunity_id>', methods=['GET', 'POST'])
@login_required
def invest(opportunity_id):
    """Investment page for a specific opportunity"""
    opportunity = InvestmentOpportunity.query.get_or_404(opportunity_id)
    farm = opportunity.farm
    
    if opportunity.status != "Open":
        flash('This investment opportunity is no longer open', 'warning')
        return redirect(url_for('investment_opportunities'))
    
    if request.method == 'POST':
        try:
            amount = float(request.form.get('amount'))
            
            # Validate investment amount
            if amount < opportunity.minimum_investment:
                flash(f'Minimum investment amount is ${opportunity.minimum_investment}', 'danger')
                return redirect(url_for('invest', opportunity_id=opportunity_id))
            
            if amount > (opportunity.amount_needed - opportunity.amount_raised):
                flash(f'Maximum available investment is ${opportunity.amount_needed - opportunity.amount_raised}', 'danger')
                return redirect(url_for('invest', opportunity_id=opportunity_id))
            
            # Create new investment
            investment = Investment(
                user_id=current_user.id,
                opportunity_id=opportunity_id,
                amount=amount
            )
            
            # Update opportunity's raised amount
            opportunity.amount_raised += amount
            
            # Update farm's current funding
            farm.current_funding += amount
            
            # Update user's total investment
            current_user.total_investment += amount
            
            # Check if opportunity is now fully funded
            if opportunity.amount_raised >= opportunity.amount_needed:
                opportunity.status = "Closed"
            
            db.session.add(investment)
            db.session.commit()
            
            flash('Investment successful!', 'success')
            return redirect(url_for('investor_dashboard'))
            
        except ValueError:
            flash('Please enter a valid amount', 'danger')
            return redirect(url_for('invest', opportunity_id=opportunity_id))
    
    # Calculate remaining investment amount
    remaining = opportunity.amount_needed - opportunity.amount_raised
    
    # Get farm performance data for risk assessment
    performances = FarmPerformance.query.filter_by(farm_id=farm.id).order_by(FarmPerformance.date).all()
    
    performance_data = {
        'dates': [performance.date.strftime('%Y-%m-%d') for performance in performances],
        'profits': [performance.profit for performance in performances]
    }
    
    # Calculate ROI projections based on historical data
    roi_projections = []
    if performances:
        # Simple projection based on average profit growth
        profits = [p.profit for p in performances]
        if len(profits) > 1:
            avg_growth = np.mean([(profits[i] / profits[i-1]) - 1 for i in range(1, len(profits))])
            for month in range(1, opportunity.duration_months + 1):
                projected_roi = opportunity.expected_roi * (month / opportunity.duration_months)
                roi_projections.append({
                    'month': month,
                    'projected_roi': projected_roi
                })
    
    return render_template('investments/invest.html', 
                          opportunity=opportunity,
                          farm=farm,
                          remaining=remaining,
                          performance_data=json.dumps(performance_data),
                          roi_projections=roi_projections)


# API Routes for AJAX requests

@app.route('/api/farm-performance/<int:farm_id>')
def api_farm_performance(farm_id):
    """API endpoint for farm performance data"""
    farm = Farm.query.get_or_404(farm_id)
    performances = FarmPerformance.query.filter_by(farm_id=farm_id).order_by(FarmPerformance.date).all()
    
    data = {
        'farm_name': farm.name,
        'dates': [performance.date.strftime('%Y-%m-%d') for performance in performances],
        'profits': [performance.profit for performance in performances],
        'revenues': [performance.revenue for performance in performances],
        'expenses': [performance.expenses for performance in performances],
        'yields': [performance.yield_amount for performance in performances]
    }
    
    return jsonify(data)


@app.route('/api/investment-summary')
@login_required
def api_investment_summary():
    """API endpoint for investment summary data"""
    investments = Investment.query.filter_by(user_id=current_user.id).all()
    
    # Group investments by farm type
    farm_type_investments = {}
    for investment in investments:
        farm_type = investment.opportunity.farm.farm_type
        if farm_type not in farm_type_investments:
            farm_type_investments[farm_type] = 0
        farm_type_investments[farm_type] += investment.amount
    
    # Prepare data for charts
    farm_types = list(farm_type_investments.keys())
    investment_amounts = list(farm_type_investments.values())
    
    # Calculate total ROI
    total_roi = 0
    for investment in investments:
        total_roi += investment.amount * (investment.opportunity.expected_roi / 100)
    
    data = {
        'farm_types': farm_types,
        'investment_amounts': investment_amounts,
        'total_invested': sum(investment_amounts),
        'total_roi': total_roi
    }
    
    return jsonify(data)


# New API Routes for Dynamic Charts & Analytics

@app.route('/api/roi-trends/<int:opportunity_id>')
@login_required
def api_roi_trends(opportunity_id):
    """API endpoint for ROI trends over time"""
    opportunity = InvestmentOpportunity.query.get_or_404(opportunity_id)
    farm = opportunity.farm
    
    # Get farm performance data
    performances = FarmPerformance.query.filter_by(farm_id=farm.id).order_by(FarmPerformance.date).all()
    
    # Calculate ROI for each period based on profits and investment amount
    dates = [performance.date.strftime('%Y-%m-%d') for performance in performances]
    
    # Calculate monthly ROI values based on profit margins
    roi_values = []
    cumulative_roi = 0
    target_roi = opportunity.expected_roi
    
    for performance in performances:
        # For demo purposes, we'll simulate ROI growth trend
        if performance.revenue > 0:
            period_roi = (performance.profit / performance.revenue) * 100
            # Adjust based on target ROI
            adjusted_roi = period_roi * (target_roi / 15)  # Scaling factor
            roi_values.append(round(adjusted_roi, 2))
            cumulative_roi += adjusted_roi
        else:
            roi_values.append(0)
    
    # Project future ROI if needed to extend the chart
    if len(dates) < 12:
        # Calculate simple trend for projection
        avg_period_roi = target_roi / 12
        for i in range(len(dates), 12):
            projected_date = datetime.strptime(dates[-1], '%Y-%m-%d')
            projected_date = projected_date.replace(month=projected_date.month + (i - len(dates) + 1))
            dates.append(projected_date.strftime('%Y-%m-%d'))
            roi_values.append(round(roi_values[-1] * 1.05, 2))  # 5% growth each period
    
    data = {
        'opportunity_name': opportunity.title,
        'farm_name': farm.name,
        'target_roi': target_roi,
        'dates': dates,
        'roi_values': roi_values,
        'cumulative_roi': round(cumulative_roi, 2)
    }
    
    return jsonify(data)


@app.route('/api/weather-yield/<int:farm_id>')
def api_weather_yield(farm_id):
    """API endpoint for weather vs. yield prediction data"""
    farm = Farm.query.get_or_404(farm_id)
    performances = FarmPerformance.query.filter_by(farm_id=farm_id).order_by(FarmPerformance.date).all()
    
    # Extract dates, yields and weather data
    dates = [performance.date.strftime('%Y-%m-%d') for performance in performances]
    yields_actual = [performance.yield_amount for performance in performances]
    weather_conditions = [performance.weather_conditions for performance in performances]
    
    # Generate predicted yields based on weather correlation
    # For demo purposes, we'll create a simple weather-to-yield relationship
    yields_predicted = []
    
    # Weather impact scores (simplified)
    weather_impact = {
        'Sunny': 1.1,
        'Cloudy': 0.9,
        'Rainy': 0.8,
        'Storm': 0.6,
        'Drought': 0.5,
        'Ideal': 1.2,
        'Cold': 0.7,
        'Hot': 0.85
    }
    
    # Calculate predicted yields based on weather
    base_yield = sum(yields_actual) / len(yields_actual) if yields_actual else 0
    for condition in weather_conditions:
        # Default impact if weather condition not in dictionary
        impact = weather_impact.get(condition, 1.0)
        predicted = base_yield * impact
        yields_predicted.append(round(predicted, 2))
    
    # Project future yields based on seasonal patterns
    # This would use more sophisticated models in a real application
    future_dates = []
    future_predictions = []
    
    # For demo purposes, project 3 months ahead
    if dates:
        last_date = datetime.strptime(dates[-1], '%Y-%m-%d')
        for i in range(1, 4):
            future_date = last_date.replace(month=last_date.month + i)
            future_dates.append(future_date.strftime('%Y-%m-%d'))
            
            # Simple yield prediction based on seasonality
            month_factor = 1 + (0.1 * ((future_date.month % 12) / 12))
            future_yield = base_yield * month_factor
            future_predictions.append(round(future_yield, 2))
    
    data = {
        'farm_name': farm.name,
        'dates': dates,
        'future_dates': future_dates,
        'yields_actual': yields_actual,
        'yields_predicted': yields_predicted,
        'future_predictions': future_predictions,
        'weather_conditions': weather_conditions
    }
    
    return jsonify(data)


@app.route('/api/market-price-prediction/<int:farm_id>')
def api_market_price_prediction(farm_id):
    """API endpoint for market price prediction data"""
    farm = Farm.query.get_or_404(farm_id)
    performances = FarmPerformance.query.filter_by(farm_id=farm_id).order_by(FarmPerformance.date).all()
    
    # Extract dates and revenue data
    dates = [performance.date.strftime('%Y-%m-%d') for performance in performances]
    revenues = [performance.revenue for performance in performances]
    yields_actual = [performance.yield_amount for performance in performances]
    
    # Calculate historical price per unit
    prices = []
    for i in range(len(revenues)):
        if yields_actual[i] > 0:
            price = revenues[i] / yields_actual[i]
            prices.append(round(price, 2))
        else:
            # If yield is zero, use previous price or a default
            previous_price = prices[-1] if prices else 10.0
            prices.append(previous_price)
    
    # For prediction, we'll use a simple time series forecast
    # In a real app, this would use a more sophisticated model
    future_dates = []
    future_prices = []
    
    if prices:
        # Calculate trend
        if len(prices) >= 2:
            avg_change = sum([(prices[i] - prices[i-1]) for i in range(1, len(prices))]) / (len(prices) - 1)
        else:
            avg_change = 0
            
        # Add seasonality factor
        last_date = datetime.strptime(dates[-1], '%Y-%m-%d') if dates else datetime.now()
        last_price = prices[-1] if prices else 10.0
        
        # Project 6 months ahead
        for i in range(1, 7):
            projected_date = last_date.replace(month=((last_date.month - 1 + i) % 12) + 1)
            if projected_date.month == 1:
                projected_date = projected_date.replace(year=projected_date.year + 1)
                
            future_dates.append(projected_date.strftime('%Y-%m-%d'))
            
            # Seasonal factor (highest in summer, lowest in winter)
            month = projected_date.month
            seasonal_factor = 1 + 0.1 * math.sin(math.pi * (month - 3) / 6)
            
            # Project price with trend and seasonality
            projected_price = last_price + (avg_change * i * seasonal_factor)
            future_prices.append(round(max(projected_price, 0.1), 2))  # Ensure no negative prices
    
    data = {
        'farm_name': farm.name,
        'farm_type': farm.farm_type,
        'dates': dates,
        'historical_prices': prices,
        'future_dates': future_dates,
        'predicted_prices': future_prices
    }
    
    return jsonify(data)


@app.route('/api/risk-levels/<int:opportunity_id>')
@login_required
def api_risk_levels(opportunity_id):
    """API endpoint for investment risk levels over time"""
    opportunity = InvestmentOpportunity.query.get_or_404(opportunity_id)
    farm = opportunity.farm
    
    # Get farm performance data
    performances = FarmPerformance.query.filter_by(farm_id=farm.id).order_by(FarmPerformance.date).all()
    
    # Extract dates
    dates = [performance.date.strftime('%Y-%m-%d') for performance in performances]
    
    # Calculate risk factors based on multiple indicators
    volatility_risks = []
    weather_risks = []
    financial_risks = []
    overall_risks = []
    
    # Weather risk mapping
    weather_risk = {
        'Sunny': 10,
        'Cloudy': 25,
        'Rainy': 40,
        'Storm': 75,
        'Drought': 90,
        'Ideal': 5,
        'Cold': 50,
        'Hot': 60
    }
    
    # Calculate initial base risk from opportunity
    if opportunity.risk_level == "Low":
        base_risk = 20
    elif opportunity.risk_level == "Medium":
        base_risk = 50
    else:  # High
        base_risk = 75
    
    for i, performance in enumerate(performances):
        # Volatility risk based on profit variability
        if i > 0 and performances[i-1].profit > 0:
            profit_change = abs((performance.profit - performances[i-1].profit) / performances[i-1].profit)
            vol_risk = min(int(profit_change * 100), 100)
        else:
            vol_risk = base_risk
        volatility_risks.append(vol_risk)
        
        # Weather risk based on conditions
        w_risk = weather_risk.get(performance.weather_conditions, 30)
        weather_risks.append(w_risk)
        
        # Financial risk based on profit margin
        if performance.revenue > 0:
            profit_margin = performance.profit / performance.revenue
            fin_risk = max(min(int((1 - profit_margin) * 100), 100), 0)
        else:
            fin_risk = base_risk
        financial_risks.append(fin_risk)
        
        # Calculate weighted overall risk
        overall_risk = int(0.3 * vol_risk + 0.3 * w_risk + 0.4 * fin_risk)
        overall_risks.append(overall_risk)
    
    # Risk category mapping
    risk_categories = []
    for risk in overall_risks:
        if risk < 30:
            risk_categories.append("Low")
        elif risk < 60:
            risk_categories.append("Medium")
        else:
            risk_categories.append("High")
    
    data = {
        'opportunity_name': opportunity.title,
        'farm_name': farm.name,
        'dates': dates,
        'volatility_risks': volatility_risks,
        'weather_risks': weather_risks,
        'financial_risks': financial_risks,
        'overall_risks': overall_risks,
        'risk_categories': risk_categories,
        'base_risk_level': opportunity.risk_level
    }
    
    return jsonify(data)


# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500
