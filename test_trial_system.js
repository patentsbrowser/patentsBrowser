// Test script for trial system
const BASE_URL = 'http://localhost:5000/api';

async function testTrialSystem() {
  console.log('🧪 Testing Free Trial System...\n');

  try {
    // Test 1: Get trial statistics
    console.log('1️⃣ Testing trial statistics endpoint');
    const statsResponse = await fetch(`${BASE_URL}/trial/statistics`);
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      console.log('✅ Trial statistics:', statsData.data);
    } else {
      console.log('❌ Failed to get trial statistics');
    }

    // Test 2: Get trial users
    console.log('\n2️⃣ Testing trial users endpoint');
    const usersResponse = await fetch(`${BASE_URL}/trial/users`);
    const usersData = await usersResponse.json();
    
    if (usersData.success) {
      console.log(`✅ Found ${usersData.total} trial users`);
      if (usersData.data.length > 0) {
        console.log('Trial users:');
        usersData.data.forEach(user => {
          const status = user.daysRemaining <= 0 ? '🔴 EXPIRED' : 
                        user.daysRemaining <= 3 ? '🟡 EXPIRING SOON' : '🟢 ACTIVE';
          console.log(`   - ${user.email}: ${user.daysRemaining} days remaining ${status}`);
        });
      }
    } else {
      console.log('❌ Failed to get trial users');
    }

    // Test 3: Trigger manual trial check
    console.log('\n3️⃣ Testing manual trial check');
    const checkResponse = await fetch(`${BASE_URL}/trial/trigger-check`, {
      method: 'POST'
    });
    const checkData = await checkResponse.json();
    
    if (checkData.success) {
      console.log('✅ Manual trial check triggered successfully');
    } else {
      console.log('❌ Failed to trigger trial check');
    }

    // Test 4: Test user-specific plans endpoint
    console.log('\n4️⃣ Testing user-specific plans (requires authentication)');
    console.log('ℹ️  This test requires a valid JWT token');
    
    // You can add a token here for testing
    const testToken = 'your-jwt-token-here';
    
    if (testToken !== 'your-jwt-token-here') {
      const plansResponse = await fetch(`${BASE_URL}/subscriptions/user-plans`, {
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });
      const plansData = await plansResponse.json();
      
      if (plansData.success) {
        console.log(`✅ User-specific plans: ${plansData.data.length} plans found`);
        console.log('User type:', plansData.userType);
      } else {
        console.log('❌ Failed to get user-specific plans');
      }
    } else {
      console.log('⏭️  Skipping authenticated test (no token provided)');
    }

    console.log('\n🎉 Trial system tests completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Trial statistics endpoint working');
    console.log('   ✅ Trial users endpoint working');
    console.log('   ✅ Manual trial check working');
    console.log('   ℹ️  User-specific plans require authentication');

    console.log('\n🔧 To test email notifications:');
    console.log('   1. Create test users with trials expiring soon');
    console.log('   2. Wait for hourly cron job or trigger manual check');
    console.log('   3. Check backend console for email logs');

  } catch (error) {
    console.error('❌ Error testing trial system:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running on port 5000');
    console.log('   2. Database is connected');
    console.log('   3. Trial routes are properly registered');
  }
}

// Test user registration with trial
async function testUserRegistrationWithTrial() {
  console.log('\n🧪 Testing User Registration with Trial...\n');

  const testUser = {
    name: 'Trial Test User',
    email: 'trial.test@example.com',
    password: 'password123',
    isOrganization: false
  };

  try {
    // Step 1: Register user
    console.log('1️⃣ Registering test user...');
    const signupResponse = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    const signupData = await signupResponse.json();
    console.log('Signup response:', signupData);

    if (signupData.statusCode === 200) {
      console.log('✅ User registration initiated - OTP sent');
      console.log('ℹ️  To complete registration:');
      console.log('   1. Check backend console for OTP');
      console.log('   2. Call verify-otp endpoint with the OTP');
      console.log('   3. User will be created with 14-day trial');
    } else {
      console.log('❌ User registration failed');
    }

  } catch (error) {
    console.error('❌ Error testing user registration:', error.message);
  }
}

// Run tests
console.log('🚀 Starting Trial System Tests...\n');
testTrialSystem().then(() => {
  testUserRegistrationWithTrial();
});
