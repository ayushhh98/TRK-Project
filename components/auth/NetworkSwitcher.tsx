"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";

export function NetworkSwitcher() {
    const { currentChainId, switchNetwork, isLoading } = useWallet();

    const networks = [
        { id: 56, name: "BSC Mainnet", color: "bg-yellow-500" },
        { id: 97, name: "BSC Testnet", color: "bg-orange-500" },
    ];

    const currentNetwork = networks.find(n => n.id === currentChainId) || { name: "Unknown", color: "bg-gray-500" };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-primary/20 bg-black/40 backdrop-blur-md">
                    <div className={`h-2 w-2 rounded-full ${currentNetwork.color}`} />
                    {currentNetwork.name}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-black/80 border-primary/20 backdrop-blur-xl">
                {networks.map((network) => (
                    <DropdownMenuItem
                        key={network.id}
                        onClick={() => switchNetwork(network.id)}
                        disabled={isLoading}
                        className="cursor-pointer gap-2 hover:bg-primary/20"
                    >
                        <div className={`h-2 w-2 rounded-full ${network.color}`} />
                        {network.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
