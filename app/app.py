from flask import Flask, abort, render_template, request, redirect, url_for, session, flash, jsonify,  send_from_directory
from flask_login import current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_session import Session
from sqlalchemy.orm import joinedload
from sqlalchemy import desc
from datetime import datetime, timedelta, timezone
import string
import random
import os
import io
import csv
from .utils import check_string_number_inclusion, concatenate_text_files, create_directory, download_file, download_image, encrypt_password, generate_id, generate_key, get_folders_in_directory, get_json_image_id, is_valid_image, rename_image, resize_image, convert_to_webp, generate_image_icon, ensure_icon_for_url, send_email, init_config, send_emailTls2, str_to_bool, process_image_data, translate
import logging
import json
from werkzeug.utils import secure_filename
import uuid
from openai import OpenAI
import requests
from flask_cors import CORS
from math import ceil
from decimal import Decimal, ROUND_HALF_UP

# Extensions
from .extensions import db, login_manager, mail, limiter, cache, csrf
from .models import User, Product, Variant, ProductImage, VariantImage, Order, OrderItem, Promotion, Country, VatRate, ShippingZone, Category, GlobalSetting, AppCurrency, Address, Message

# Blueprints
from .blueprints.cart import cart_bp
from .blueprints.checkout import checkout_bp
from .blueprints.countries import countries_bp
from .blueprints.account import account_bp
from .blueprints.main import main_bp
from .blueprints.api import api_bp

# Logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
file_handler = logging.FileHandler('app.log')
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# Global Config Loading (for backward compatibility and extensions)
encryption_key = os.environ.get('ENCRYPTION_KEY')
config_dict = init_config("./config.txt","./encrypt_config_file.txt")

# Expose constants for tests/imports
ADMIN_USER = config_dict.get('APP_ADMIN_USER')
ADMIN_EMAIL = config_dict.get('APP_ADMIN_EMAIL')
ADMIN_PASSWORD = config_dict.get('APP_ADMIN_PASSWORD')

def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')

    # Apply config
    # Map text file config keys to app config
    app.config['SECRET_KEY'] = config_dict['APP_SECRET_KEY']
    app.config['SQLALCHEMY_DATABASE_URI'] = config_dict['APP_SQLALCHEMY_DATABASE_URI']
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SESSION_TYPE'] = config_dict['APP_SESSION_TYPE']
    app.config['SESSION_PERMANENT'] = str_to_bool(config_dict['APP_SESSION_PERMANENT'])
    app.config['PERMANENT_SESSION_LIFETIME'] = int(config_dict['APP_PERMANENT_SESSION_LIFETIME'])

    # Store custom config in app.config for access in blueprints
    for k, v in config_dict.items():
        app.config[k] = v

    # Security & Performance Config
    app.config['WTF_CSRF_ENABLED'] = True # Explicitly enable
    # SQLAlchemy Pooling
    # Only apply pooling options for non-SQLite databases to avoid TypeError
    if 'sqlite' not in app.config['SQLALCHEMY_DATABASE_URI']:
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'pool_size': 10,
            'pool_recycle': 3600,
            'pool_pre_ping': True
        }

    # Caching Config
    app.config['CACHE_TYPE'] = 'SimpleCache'
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300

    # Rate Limiting
    app.config['RATELIMIT_DEFAULT'] = "200 per day"
    app.config['RATELIMIT_STORAGE_URI'] = "memory://"

    # Extensions Init
    db.init_app(app)
    Session(app)

    login_manager.init_app(app)
    login_manager.login_view = 'main.login' # Updated endpoint
    login_manager.session_protection = "strong"

    mail.init_app(app)
    limiter.init_app(app)
    cache.init_app(app)
    csrf.init_app(app)

    CORS(app, origins=["http://localhost:8000"]) # Config?

    # Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(checkout_bp)
    app.register_blueprint(countries_bp)
    app.register_blueprint(account_bp)

    # Exempt API from CSRF if needed (e.g. for simple fetch without token logic yet)
    # But security requirement says "Enable... globally".
    # I should attempt to make it work.
    # To enable fetch requests to work, I need to expose the token.

    # Context Processors
    @app.context_processor
    def inject_global_settings():
        currency = GlobalSetting.query.filter_by(key='currency').first()
        return {
            'now': datetime.now(timezone.utc),
            'currency_symbol': currency.value if currency else '€',
            'admin_user': app.config.get('APP_ADMIN_USER')
        }

    @app.template_filter('icon_url')
    def icon_url_filter(url):
        if not url: return url
        if '/static/' not in url: return url
        base, _ = os.path.splitext(url)
        if base.endswith("_icon"): return url
        return base + "_icon.webp"

    # After Request - Security Headers (CSP)
    @app.after_request
    def set_security_headers(response):
        # Basic CSP - allows self, unsafe-inline (often needed for legacy JS), and data: images
        # In production, 'unsafe-inline' should be removed and nonces used.
        # Given the "vanilla JS" nature, unsafe-inline might be required for now.
        csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'"
        response.headers['Content-Security-Policy'] = csp
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        return response

    return app

# Login loader
@login_manager.user_loader
def load_user(user_id):
    try:
        return User.query.get(int(user_id))
    except Exception:
        return None

app = create_app()

# Setup Database Helper (simplified/moved logic)
def setup_database_cli(app_instance=None):
    from .seeder import setup_database
    if app_instance is None:
        # Fallback to global app if not provided (for CLI usage)
        app_instance = app
    setup_database(app_instance)

setup_database = setup_database_cli

if __name__ == "__main__":
    # If run directly, maybe run setup
    # setup_database_cli()
    app.run(host="0.0.0.0", port=5000)
