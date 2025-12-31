'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

interface ContributeButtonProps {
  taskId: string;
}

export default function ContributeButton({ taskId }: ContributeButtonProps) {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState('10');
  const [isContributing, setIsContributing] = useState(false);

  const handleContribute = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 10) {
      toast.error('Minimum contribution is $10 USDC');
      return;
    }

    setIsContributing(true);

    try {
      // TODO: Implement actual on-chain contribution
      // This would involve:
      // 1. Creating an Anchor program client
      // 2. Calling the contribute instruction
      // 3. Signing the transaction with wallet

      toast.error('On-chain contribution not yet implemented');

      // Placeholder for the actual implementation:
      /*
      const program = new Program(IDL, PROGRAM_ID, provider);
      const tx = await program.methods
        .contribute(new BN(amountNum * 1_000_000)) // Convert to 6 decimals
        .accounts({
          task: taskPubkey,
          escrow: escrowPda,
          contributor: publicKey,
          usdcMint: USDC_MINT,
          // ... other accounts
        })
        .rpc();

      toast.success('Contribution successful!');
      */
    } catch (error: any) {
      console.error('Contribution error:', error);
      toast.error(error?.message || 'Contribution failed');
    } finally {
      setIsContributing(false);
    }
  };

  if (!connected) {
    return (
      <div className="text-center text-sm text-gray-600 py-4">
        Connect wallet to contribute
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Contribution Amount (USDC)
      </label>
      <input
        type="number"
        min="10"
        step="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        placeholder="10.00"
      />
      <p className="text-xs text-gray-500 mt-1">Minimum: $10 USDC</p>

      <button
        onClick={handleContribute}
        disabled={isContributing}
        className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isContributing ? 'Contributing...' : `Contribute $${amount} USDC`}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Your vote weight = your contribution amount
      </p>
    </div>
  );
}
