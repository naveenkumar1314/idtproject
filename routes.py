from flask import render_template, redirect, url_for, flash, request, jsonify, abort
from flask_login import login_user, logout_user, current_user, login_required
from datetime import datetime, date
import json
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


# Error handlers
@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500
