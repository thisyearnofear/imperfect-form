import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { signerUuid, reps, exerciseMode, timeSpent, network, imageUrl } = await req.json();
    
    // Map networks to the correct Farcaster channel IDs and display names
    // These are based on the official channel names you provided
    const channelMap: Record<string, { channelId: string, displayName: string }> = {
      'polygon': {
        channelId: 'polygon', 
        displayName: 'Polygon Mainnet'
      },
      'base': {
        channelId: 'base-builds', 
        displayName: 'Base Sepolia'
      },
      'celo': {
        channelId: 'celo', 
        displayName: 'Celo Mainnet'
      },
      'monad': {
        channelId: 'monad', 
        displayName: 'Monad Testnet'
      },
      'default': {
        channelId: 'fitness', 
        displayName: 'Onchain Olympics'
      }
    };
    
    // Get channel information based on the network
    const channelInfo = channelMap[network] || channelMap.default;
    
    // Get fun, personalized messages for the network
    const repCount = parseInt(reps, 10);
    const exerciseType = exerciseMode.toLowerCase().includes('push') ? 'pushup' : 'squat';
    const singularExercise = exerciseType;
    const pluralExercise = `${exerciseType}s`;
    const exercise = repCount === 1 ? singularExercise : pluralExercise;
    
    // Network-specific fun messages with promotion for both main app and prediction market
    const funMessages = {
      'base': [
        `Just built these buns on Base! ${reps} ${exercise} in ${timeSpent}. 💪\n\nBuild your Base at imperfectform.fun 🏋️‍♂️\n\nPredict fitness results & win rewards at imperfectminiapp.vercel.app (80% to winners, 15% to @greenpillnetwork) 💰`,
        `${reps} ${exercise} in ${timeSpent}? That's BASED! 🔥\n\nJoin the squat squad at imperfectform.fun 💪\n\nThink you can predict workout champs? Join our prediction market at imperfectminiapp.vercel.app 🎟️`,
        `Building a solid Base with ${reps} ${exercise}. My foundation is strong in ${timeSpent}! 💪\n\nWorkout at imperfectform.fun 🔥\n\nBet on fitness outcomes & support charity @greenpillnetwork at imperfectminiapp.vercel.app 💪💰`,
        `Got my heart racing on Base with ${reps} ${exercise} in ${timeSpent}. 🏆\n\nBe BASED at imperfectform.fun 🚀\n\nPut your prediction skills to the test at imperfectminiapp.vercel.app 🤓`,
        `Base builders unite! Just crushed ${reps} ${exercise} in ${timeSpent}. 💪\n\nJoin the Onchain Olympics at imperfectform.fun 🏆\n\nPut your money where your muscles are at imperfectminiapp.vercel.app 💸`
      ],
      'polygon': [
        `Got a BIG pump in on these ${exercise === 'pushup' || exercise === 'pushups' ? 'pecs' : 'quads'} on Polygon! ${reps} ${exercise} in ${timeSpent}. 💪\n\nWorkout with me at imperfectform.fun 💜\n\nPredict & win on our Farcaster mini app at imperfectminiapp.vercel.app! 80% to winners, 15% to @greenpillnetwork 💰`,
        `Concerns about aging are polyGONE after ${reps} ${exercise} in ${timeSpent}! 👀\n\nJoin me at imperfectform.fun 👀\n\nForecast fitness champions on our prediction market at imperfectminiapp.vercel.app 📈`,
        `Just crushed ${reps} ${exercise} in ${timeSpent} on Polygon! My gains are multiplying faster than gas fees. 💪\n\nTry at imperfectform.fun 💪\n\nBet on fitness outcomes & support @greenpillnetwork at imperfectminiapp.vercel.app 🎟️`,
        `POLYspeed, POLYstrength! ${reps} ${exercise} in ${timeSpent}. 🔥\n\nChallenge me at imperfectform.fun 🏋️‍♂️\n\nThink you can predict workout winners? Visit imperfectminiapp.vercel.app 💰`,
        `${reps} ${exercise} on Polygon has me feeling POLYamorous with fitness! ${timeSpent} well spent. 💜\n\nJoin at imperfectform.fun 💜\n\nPut your prediction skills to work & support charity at imperfectminiapp.vercel.app 🚀`
      ],
      'celo': [
        `CELObrating my fitness journey with ${reps} ${exercise} in ${timeSpent}! 🎉\n\nJoin the party at imperfectform.fun 🎉\n\nPredict fitness winners & support @greenpillnetwork on our FC mini app at imperfectminiapp.vercel.app! 🎟️`,
        `CELO and behold! ${reps} ${exercise} in ${timeSpent}. 💪\n\nMobile-first fitness at imperfectform.fun 📱💪\n\nBet on workout champions at imperfectminiapp.vercel.app (80% to winners) 💰`,
        `Just CELOwned my workout with ${reps} ${exercise} in ${timeSpent}! 🔥\n\nCan you beat me at imperfectform.fun? 🏆\n\nPredict & earn on our Farcaster mini app at imperfectminiapp.vercel.app while supporting charity! 💸`,
        `Financial inclusion? More like fitness inclusion! ${reps} ${exercise} in ${timeSpent} on Celo. 💪\n\nJoin at imperfectform.fun 🌎\n\nMake predictions on fitness outcomes at imperfectminiapp.vercel.app 🤓`,
        `CELOw me to flex these gains: ${reps} ${exercise} in ${timeSpent}! 💪\n\nYour turn at imperfectform.fun 💪\n\nPlace bets on our prediction market at imperfectminiapp.vercel.app & support @greenpillnetwork 💰`
      ],
      'monad': [
        `One with the MONADs! ${reps} ${exercise} in ${timeSpent}. 🧠\n\nPhilosophical gains at imperfectform.fun 🧠\n\nApply your logical mind on our prediction market at imperfectminiapp.vercel.app 💸`,
        `MONADical fitness powers activated with ${reps} ${exercise} in ${timeSpent}! 💫\n\nJoin me at imperfectform.fun 💫\n\nPredict workout winners at imperfectminiapp.vercel.app & support @greenpillnetwork (80% to winners, 15% to charity) 💰`,
        `Discovered the fundamental unit of fitness: ${reps} ${exercise} in ${timeSpent} on Monad! 💪\n\nTry at imperfectform.fun 🔍\n\nApply first principles to our prediction market at imperfectminiapp.vercel.app 📈`,
        `MONAD: My Only Notable Athletic Development - ${reps} ${exercise} in ${timeSpent}! 🔥\n\nYour turn at imperfectform.fun 🏋️‍♂️\n\nMake smart predictions on our Farcaster mini app at imperfectminiapp.vercel.app! 🤓`,
        `${reps} ${exercise} in ${timeSpent}? That's MONADness! 💪\n\nChallenge me at imperfectform.fun 🚀\n\nPut your prediction powers to work at imperfectminiapp.vercel.app & support charity @greenpillnetwork 💰`
      ],
      'default': [
        `I just completed ${reps} ${exercise} in ${timeSpent} on Imperfect Form! 💪\n\nCome join the Onchain Olympics at imperfectform.fun 🏅\n\nPredict workout champions on our Farcaster mini app at imperfectminiapp.vercel.app (80% to winners, 15% to @greenpillnetwork) 💰`,
        `${reps} ${exercise} in ${timeSpent}! My blockchain fitness journey continues. 🏆\n\nJoin me at imperfectform.fun 🏆\n\nTest your prediction skills & support charity on our FC mini app at imperfectminiapp.vercel.app! 🎟️`,
        `Just smashed ${reps} ${exercise} in ${timeSpent}! Can you beat my high score? 💪\n\nTry at imperfectform.fun 💪\n\nBet on fitness outcomes at imperfectminiapp.vercel.app (80% to winners, 15% to @greenpillnetwork) 💸`
      ]
    };
    
    // Select a random fun message for the network
    const networkKey = network && network in funMessages ? network : 'default';
    const messages = funMessages[networkKey as keyof typeof funMessages];
    const randomIndex = Math.floor(Math.random() * messages.length);
    const text = messages[randomIndex];
    
    // Generate URL for the custom workout image
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';
    const customImageUrl = `${baseUrl}/api/frames/workout/image?reps=${reps}&exerciseMode=${exerciseMode}&timeSpent=${timeSpent}`;
    
    // Use the provided image URL if available, otherwise use our custom image
    const finalImageUrl = imageUrl || customImageUrl;
    
    // Add image to embeds
    const embeds = [{ url: finalImageUrl }];
    
    // For debugging
    console.log(`Using channel: ${channelInfo.channelId} for network: ${network}`);
    
    // Using direct API call to Neynar v2 API
    const apiUrl = 'https://api.neynar.com/v2/farcaster/cast';
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api_key': process.env.NEYNAR_API_KEY!
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        embeds,
        channel_id: channelInfo.channelId
      })
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Neynar API error (${apiResponse.status}): ${errorText}`);
    }
    
    const result = await apiResponse.json();
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error('Error posting to Farcaster:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error posting to Farcaster'
    }, { status: 500 });
  }
}
