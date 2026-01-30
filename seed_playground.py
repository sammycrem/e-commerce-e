from app.app import app, setup_database

with app.app_context():
    setup_database(app)
    print("Database seeded successfully.")
