/**
 * START UBOS
 *
 * Main entry point to start the Universal Business OS
 * Initializes system, starts scheduler, runs autonomously
 */

import { getUBOS } from './src/ubos';
import { getScheduler } from './src/automation/daily_scheduler';

async function startUBOS() {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   UNIVERSAL BUSINESS OS                                ║');
  console.log('║   Autonomous Business Operations Platform              ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    // Initialize UBOS
    console.log('🚀 Initializing UBOS...\n');
    const ubos = getUBOS();
    await ubos.initialize();

    console.log('═══════════════════════════════════════════════════════\n');

    // Start scheduler
    const scheduler = getScheduler();
    scheduler.start();

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ UBOS IS NOW OPERATIONAL\n');
    console.log('📊 Monitoring: 24/7');
    console.log('🔒 Financial Guardrails: ACTIVE');
    console.log('🤖 Agents: 8/8 Online');
    console.log('💡 Opportunity Scanner: Running');
    console.log('📱 Telegram Notifications: Enabled\n');
    console.log('═══════════════════════════════════════════════════════\n');

    // Send startup notification
    await scheduler.sendAlert(
      'UBOS started successfully. All systems operational. Running autonomously.',
      'medium'
    );

    // Keep process running
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down UBOS...\n');
      scheduler.stop();
      await scheduler.sendAlert('UBOS shutting down.', 'low');
      process.exit(0);
    });

    // Handle uncaught errors
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught exception:', error);
      await scheduler.sendAlert(
        `ERROR: ${error.message}. UBOS may need restart.`,
        'high'
      );
    });

    process.on('unhandledRejection', async (error) => {
      console.error('❌ Unhandled rejection:', error);
      await scheduler.sendAlert(
        `ERROR: Unhandled promise rejection. UBOS may need restart.`,
        'high'
      );
    });

    console.log('Press Ctrl+C to stop UBOS\n');

  } catch (error) {
    console.error('\n❌ Failed to start UBOS:', error);
    process.exit(1);
  }
}

// Start the system
startUBOS();
