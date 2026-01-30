import os
from app.app import app, db, setup_database

with app.app_context():
    # Drop all tables
    db.drop_all()
    # Create all tables
    db.create_all()
    print("Database tables recreated successfully.")
    # Seed data
    setup_database(app)
    print("Database seeded successfully.")
