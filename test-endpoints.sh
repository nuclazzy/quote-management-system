#!/bin/bash

echo "Testing Admin Settings API Endpoints"
echo "===================================="

# Test GET /api/admin/settings
echo "1. Testing GET /api/admin/settings"
echo "Request: GET /api/admin/settings"
echo "Expected: 200 OK with default company settings"
echo ""

# Test PUT /api/admin/settings  
echo "2. Testing PUT /api/admin/settings"
echo "Request: PUT /api/admin/settings with company data"
echo "Expected: 200 OK with success message"
echo ""

# Test GET /api/admin/users
echo "3. Testing GET /api/admin/users"
echo "Request: GET /api/admin/users"
echo "Expected: 200 OK with static user list"
echo ""

echo "To test these endpoints:"
echo "1. Start the development server: npm run dev"
echo "2. Access admin settings: http://localhost:3000/admin/settings"
echo "3. Login with password: admin123"
echo "4. Test the settings form functionality"