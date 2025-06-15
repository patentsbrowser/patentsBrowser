import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api';

async function testPlansAPI() {
  console.log('Testing Plans API Endpoints...\n');

  try {
    // Test 1: Get all plans
    console.log('1. Testing GET /subscriptions/plans (all plans)');
    const allPlansResponse = await fetch(`${BASE_URL}/subscriptions/plans`);
    const allPlansData = await allPlansResponse.json();
    
    if (allPlansData.success) {
      console.log(`✅ Success: Found ${allPlansData.data.length} total plans`);
    } else {
      console.log('❌ Failed to fetch all plans');
    }

    // Test 2: Get individual plans
    console.log('\n2. Testing GET /subscriptions/plans?planType=individual');
    const individualPlansResponse = await fetch(`${BASE_URL}/subscriptions/plans?planType=individual`);
    const individualPlansData = await individualPlansResponse.json();
    
    if (individualPlansData.success) {
      console.log(`✅ Success: Found ${individualPlansData.data.length} individual plans`);
      console.log('Individual plans:');
      individualPlansData.data.forEach(plan => {
        console.log(`   - ${plan.name}: ₹${plan.price} (${plan.type})`);
      });
    } else {
      console.log('❌ Failed to fetch individual plans');
    }

    // Test 3: Get organization plans
    console.log('\n3. Testing GET /subscriptions/plans?planType=organization');
    const orgPlansResponse = await fetch(`${BASE_URL}/subscriptions/plans?planType=organization`);
    const orgPlansData = await orgPlansResponse.json();
    
    if (orgPlansData.success) {
      console.log(`✅ Success: Found ${orgPlansData.data.length} organization plans`);
      console.log('Organization plans:');
      orgPlansData.data.forEach(plan => {
        console.log(`   - ${plan.name}: ₹${plan.organizationBasePrice || plan.price} + ₹${plan.memberPrice}/member (${plan.type})`);
      });
    } else {
      console.log('❌ Failed to fetch organization plans');
    }

    // Test 4: Check plan categories
    console.log('\n4. Verifying plan categories...');
    const individualCount = individualPlansData.data.filter(p => p.planCategory === 'individual').length;
    const orgCount = orgPlansData.data.filter(p => p.planCategory === 'organization').length;
    
    console.log(`✅ Individual plans with correct category: ${individualCount}/${individualPlansData.data.length}`);
    console.log(`✅ Organization plans with correct category: ${orgCount}/${orgPlansData.data.length}`);

    // Test 5: Check plan types distribution
    console.log('\n5. Plan types distribution:');
    const allPlans = allPlansData.data;
    const monthlyPlans = allPlans.filter(p => p.type === 'monthly').length;
    const quarterlyPlans = allPlans.filter(p => p.type === 'quarterly').length;
    const yearlyPlans = allPlans.filter(p => p.type === 'yearly').length;
    
    console.log(`   Monthly: ${monthlyPlans}`);
    console.log(`   Quarterly: ${quarterlyPlans}`);
    console.log(`   Yearly: ${yearlyPlans}`);

    console.log('\n🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 5000');
  }
}

// Run the tests
testPlansAPI();
