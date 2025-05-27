#!/usr/bin/env python3
"""
Test script to check if all imports work correctly.
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_imports():
    """Test all critical imports."""
    
    print("Testing imports...")
    
    try:
        print("1. Testing base import...")
        from app.models.base import Base
        print("   ✓ Base imported successfully")
        
        print("2. Testing user model...")
        from app.models.user import User, UserRole, UserStatus
        print("   ✓ User models imported successfully")
        
        print("3. Testing item model...")
        from app.models.item import Item, Category, ItemStatus
        print("   ✓ Item models imported successfully")
        
        print("4. Testing contract model...")
        from app.models.contract import Contract, ContractStatus
        print("   ✓ Contract models imported successfully")
        
        print("5. Testing notification model...")
        from app.models.notification import Notification, NotificationType
        print("   ✓ Notification models imported successfully")
        
        print("6. Testing models __init__...")
        from app.models import Base as InitBase, User as InitUser, Contract as InitContract
        print("   ✓ Models __init__ imported successfully")
        
        print("7. Testing database config...")
        from app.core.database import engine, SessionLocal
        print("   ✓ Database config imported successfully")
        
        print("8. Testing main app...")
        from app.main import app
        print("   ✓ Main app imported successfully")
        
        print("\n✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)