"use client";

import { MembershipModal } from "@/components/cash/MembershipModal";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
}

export function DepositModal({ isOpen, onClose, onConfirm }: DepositModalProps) {
    return (
        <MembershipModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
        />
    );
}
