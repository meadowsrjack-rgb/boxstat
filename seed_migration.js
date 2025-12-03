import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sampleMigrationData = [
  {
    email: 'test@example.com',
    stripeCustomerId: 'cus_legacy_123',
    stripeSubscriptionId: 'sub_legacy_456',
    productName: 'UYP Premium Membership',
    isClaimed: false,
  },
  {
    email: 'test@example.com',
    stripeCustomerId: 'cus_legacy_123',
    stripeSubscriptionId: 'sub_legacy_789',
    productName: 'UYP Youth Basketball Program',
    isClaimed: false,
  },
  {
    email: 'parent@test.com',
    stripeCustomerId: 'cus_legacy_456',
    stripeSubscriptionId: 'sub_legacy_aaa',
    productName: 'UYP Spring Season Pass',
    isClaimed: false,
  },
  {
    email: 'family@boxstat.com',
    stripeCustomerId: 'cus_legacy_789',
    stripeSubscriptionId: 'sub_legacy_bbb',
    productName: 'UYP Family Package',
    isClaimed: false,
  },
  {
    email: 'family@boxstat.com',
    stripeCustomerId: 'cus_legacy_789',
    stripeSubscriptionId: 'sub_legacy_ccc',
    productName: 'UYP Elite Training',
    isClaimed: false,
  },
];

async function seedMigrationData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding migration lookup data...\n');
    
    for (const data of sampleMigrationData) {
      const existingCheck = await client.query(
        'SELECT id FROM migration_lookup WHERE email = $1 AND stripe_subscription_id = $2',
        [data.email, data.stripeSubscriptionId]
      );
      
      if (existingCheck.rows.length > 0) {
        console.log(`  ⏭️  Skipping existing: ${data.email} - ${data.productName}`);
        continue;
      }
      
      await client.query(
        `INSERT INTO migration_lookup (email, stripe_customer_id, stripe_subscription_id, product_name, is_claimed)
         VALUES ($1, $2, $3, $4, $5)`,
        [data.email, data.stripeCustomerId, data.stripeSubscriptionId, data.productName, data.isClaimed]
      );
      
      console.log(`  ✅ Added: ${data.email} - ${data.productName}`);
    }
    
    console.log('\n🎉 Migration seed data complete!\n');
    
    const result = await client.query('SELECT * FROM migration_lookup');
    console.log('Current migration_lookup table:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Error seeding migration data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedMigrationData();
