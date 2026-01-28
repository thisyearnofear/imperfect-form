/**
 * Analyze leaderboard data across all chains
 */

const { ethers } = require('ethers');

const CONTRACTS = {
  celo: {
    address: '0xB0cbC7325EbC744CcB14211CA74C5a764928F273',
    rpc: 'https://forno.celo.org',
    name: 'Celo',
    abi: [
      {
        inputs: [],
        name: 'getLeaderboard',
        outputs: [
          {
            components: [
              { internalType: 'address', name: 'user', type: 'address' },
              { internalType: 'uint256', name: 'pushups', type: 'uint256' },
              { internalType: 'uint256', name: 'squats', type: 'uint256' },
              { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
            ],
            internalType: 'struct Score[]',
            name: '',
            type: 'tuple[]',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ]
  },
  base: {
    address: '0x58DC4867f87473BF9874892dE8e62C48958c8d96',
    rpc: 'https://mainnet.base.org',
    name: 'Base',
    abi: [
      {
        inputs: [],
        name: 'getLeaderboard',
        outputs: [
          {
            components: [
              { internalType: 'address', name: 'user', type: 'address' },
              { internalType: 'uint256', name: 'pushups', type: 'uint256' },
              { internalType: 'uint256', name: 'squats', type: 'uint256' },
              { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
              { internalType: 'uint256', name: 'totalScore', type: 'uint256' },
            ],
            internalType: 'struct StandardFitnessLeaderboard.Score[]',
            name: '',
            type: 'tuple[]',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ]
  },
  polygon: {
    address: '0x28FE19798fe0A0276CF474f2DCC3749313f1aC0A',
    rpc: 'https://polygon-rpc.com',
    name: 'Polygon',
    abi: [
      {
        inputs: [],
        name: 'getLeaderboard',
        outputs: [
          {
            components: [
              { internalType: 'address', name: 'user', type: 'address' },
              { internalType: 'uint256', name: 'pushups', type: 'uint256' },
              { internalType: 'uint256', name: 'squats', type: 'uint256' },
              { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
              { internalType: 'uint256', name: 'totalScore', type: 'uint256' },
            ],
            internalType: 'struct StandardFitnessLeaderboard.Score[]',
            name: '',
            type: 'tuple[]',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ]
  },
};

async function fetchData(chainKey) {
  const config = CONTRACTS[chainKey];
  console.log(`\n========================================`);
  console.log(`${config.name} (${chainKey})`);
  console.log(`Address: ${config.address}`);
  console.log(`========================================`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const contract = new ethers.Contract(config.address, config.abi, provider);
    
    const data = await contract.getLeaderboard();
    
    console.log(`Total entries: ${data.length}`);
    
    if (data.length === 0) {
      return { chain: chainKey, entries: [] };
    }
    
    const entries = data.map(entry => ({
      user: entry.user,
      pushups: Number(entry.pushups),
      squats: Number(entry.squats),
      timestamp: Number(entry.timestamp)
    }));
    
    // Sort by pushups
    const pushupsLeaderboard = [...entries]
      .filter(e => e.pushups > 0)
      .sort((a, b) => b.pushups - a.pushups);
    
    // Sort by squats
    const squatsLeaderboard = [...entries]
      .filter(e => e.squats > 0)
      .sort((a, b) => b.squats - a.squats);
    
    console.log(`\n📊 Pushups Leaderboard:`);
    pushupsLeaderboard.slice(0, 5).forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.user.slice(0, 20)}... - ${entry.pushups} pushups`);
    });
    
    console.log(`\n📊 Squats Leaderboard:`);
    squatsLeaderboard.slice(0, 5).forEach((entry, i) => {
      console.log(`  ${i + 1}. ${entry.user.slice(0, 20)}... - ${entry.squats} squats`);
    });
    
    return { chain: chainKey, entries };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { chain: chainKey, entries: [], error: error.message };
  }
}

async function main() {
  console.log('Analyzing leaderboard data across all chains...\n');
  
  const results = [];
  for (const chainKey of Object.keys(CONTRACTS)) {
    const result = await fetchData(chainKey);
    results.push(result);
  }
  
  // Aggregate data across all chains
  console.log(`\n\n========================================`);
  console.log('AGGREGATED LEADERBOARD (All Chains)');
  console.log('========================================');
  
  const allPushups = [];
  const allSquats = [];
  
  for (const result of results) {
    if (result.entries) {
      for (const entry of result.entries) {
        if (entry.pushups > 0) {
          allPushups.push({ ...entry, chain: result.chain });
        }
        if (entry.squats > 0) {
          allSquats.push({ ...entry, chain: result.chain });
        }
      }
    }
  }
  
  // Sort
  allPushups.sort((a, b) => b.pushups - a.pushups);
  allSquats.sort((a, b) => b.squats - a.squats);
  
  console.log(`\n🏆 COMBINED PUSHUPS LEADERBOARD (${allPushups.length} entries):`);
  allPushups.slice(0, 10).forEach((entry, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    console.log(`  ${medal} ${entry.user.slice(0, 20)}... - ${entry.pushups} pushups (${entry.chain})`);
  });
  
  console.log(`\n🏆 COMBINED SQUATS LEADERBOARD (${allSquats.length} entries):`);
  allSquats.slice(0, 10).forEach((entry, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    console.log(`  ${medal} ${entry.user.slice(0, 20)}... - ${entry.squats} squats (${entry.chain})`);
  });
  
  // Summary
  console.log(`\n\n========================================`);
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total unique pushup entries: ${allPushups.length}`);
  console.log(`Total unique squat entries: ${allSquats.length}`);
  console.log(`\nBreakdown by chain:`);
  for (const result of results) {
    const pushupCount = result.entries?.filter(e => e.pushups > 0).length || 0;
    const squatCount = result.entries?.filter(e => e.squats > 0).length || 0;
    console.log(`  ${result.chain}: ${pushupCount} pushup entries, ${squatCount} squat entries`);
  }
}

main().catch(console.error);
