"use client";

import { RedemptionModal } from "@/components/cash/RedemptionModal";

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedWallet?: string | null;
}

export function WithdrawalModal({ isOpen, onClose, preSelectedWallet }: WithdrawalModalProps) {
    return (
        <RedemptionModal
            isOpen={isOpen}
            onClose={onClose}
            preSelectedWallet={preSelectedWallet}
        />
    );
}
