/**
 * Utility functions for Farcaster integration
 */

// Default to the current backend URL if not specified in environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://imperfect-form.onrender.com';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://imperfect-form.onrender.com';

// Import socket.io-client only on the client side
let io: typeof import('socket.io-client').default | null = null;
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('socket.io-client').then((module) => {
    io = module.default;
  });
}

/**
 * Store signer data via REST API
 */
export async function storeSignerREST(data: {
  signer_uuid: string;
  fid: string;
  reps: number;
  exerciseMode: string;
  formattedTimeSpent: string;
}) {
  try {
    const response = await fetch(`${API_URL}/api/store-signer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to store signer: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error storing signer:', error);
    throw error;
  }
}

/**
 * Share a cast via REST API
 */
export async function shareCastREST(data: {
  signer_uuid: string;
  text: string;
  embeds?: Array<{ url: string }>;
  replyTo?: string;
}) {
  try {
    const response = await fetch(`${API_URL}/api/confirm-cast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to share cast: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sharing cast:', error);
    throw error;
  }
}

/**
 * Connect to the Socket.IO server
 */
export function connectSocket() {
  if (typeof window === 'undefined' || !io) {
    console.warn('Socket.io is not available on the server side');
    return null;
  }

  return io(SOCKET_URL);
}

/**
 * Store signer data via Socket.IO
 */
export function storeSignerSocket(
  socket: ReturnType<typeof import('socket.io-client').default> | null,
  data: {
    signer_uuid: string;
    fid: string;
    reps: number;
    exerciseMode: string;
    formattedTimeSpent: string;
  }
) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('store-signer', data);

    socket.on('store-signer-response', (response: { success: boolean; error?: string }) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Failed to store signer'));
      }
    });
  });
}

/**
 * Share a cast via Socket.IO
 */
export function shareCastSocket(
  socket: ReturnType<typeof import('socket.io-client').default> | null,
  data: {
    signer_uuid: string;
    text: string;
    embeds?: Array<{ url: string }>;
    parent?: string;
  }
) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('confirm-cast', data);

    socket.on('confirm-cast-response', (response: { success: boolean; error?: string }) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error || 'Failed to share cast'));
      }
    });
  });
}

// Channel options for Farcaster
export const FARCASTER_CHANNELS = [
  {
    name: "Fitness",
    parent_url:
      "chain://eip155:1/erc721:0xee442da02f2cdcbc0140162490a068c1da94b929",
  },
  { name: "Very Internet Person", parent_url: "https://veryinter.net/person" },
  { name: "Spanish", parent_url: "https://farcaster.group/spanish" },
  { name: "Wellness", parent_url: "https://farcaster.group/wellness" },
  { name: "Random", parent_url: "https://farcaster.group/random" },
];
