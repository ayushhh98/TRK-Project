import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface LogoProps extends HTMLMotionProps<"div"> {
    withText?: boolean;
}

export function Logo({ className, withText = false, ...props }: LogoProps) {
    return (
        <motion.div
            className={cn("flex items-center gap-2", className)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            {...props}
        >
            <div className={cn("relative", withText ? "h-12 w-40" : "h-full w-full aspect-square")}>
                <Image
                    src="/logo.png"
                    alt="TRK Logo"
                    fill
                    sizes="(max-width: 768px) 40px, (max-width: 1200px) 160px, 160px"
                    className="object-contain drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                    priority
                />
            </div>
        </motion.div>
    );
}
