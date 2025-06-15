// Test script to verify OTP service is working
const BASE_URL = 'http://localhost:5000/api';

async function testOTPService() {
  console.log('🧪 Testing OTP Service...\n');

  const testEmail = 'test@example.com';
  const testData = {
    name: 'Test User',
    email: testEmail,
    password: 'password123',
    isOrganization: false
  };

  try {
    // Test 1: Signup (should send OTP)
    console.log('1️⃣ Testing Signup (OTP should be sent)');
    const signupResponse = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const signupData = await signupResponse.json();
    console.log('Signup Response:', signupData);
    
    if (signupData.statusCode === 200 && signupData.data.mode === 'verify') {
      console.log('✅ Signup successful - OTP should be sent');
    } else {
      console.log('❌ Signup failed or unexpected response');
      return;
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Resend OTP
    console.log('\n2️⃣ Testing Resend OTP');
    const resendResponse = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: testEmail })
    });
    
    const resendData = await resendResponse.json();
    console.log('Resend OTP Response:', resendData);
    
    if (resendData.statusCode === 200) {
      console.log('✅ Resend OTP successful');
    } else {
      console.log('❌ Resend OTP failed');
    }

    // Test 3: Test with invalid email
    console.log('\n3️⃣ Testing Resend OTP with invalid email');
    const invalidResendResponse = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });
    
    const invalidResendData = await invalidResendResponse.json();
    console.log('Invalid Email Resend Response:', invalidResendData);
    
    if (invalidResendData.statusCode === 404) {
      console.log('✅ Correctly handled invalid email');
    } else {
      console.log('❌ Invalid email handling failed');
    }

    console.log('\n🎉 OTP Service tests completed!');
    console.log('\n📋 Check your backend console for OTP logs:');
    console.log('   - Look for "Generated new OTP: XXXXXX"');
    console.log('   - Look for "MOCK EMAIL SENT" if using development mode');
    console.log('   - Check email if using production email settings');

  } catch (error) {
    console.error('❌ Error testing OTP service:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running on port 5000');
    console.log('   2. Database is connected');
    console.log('   3. Check backend console for OTP logs');
  }
}

// Run the tests
testOTPService();
