import { Card, CardContent } from "@/components/ui/Card";

export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-transparent pb-20">
            <main className="container mx-auto px-4 py-8 space-y-10">
                {/* Header Skeleton */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 pb-8 border-b border-white/5 animate-pulse">
                    <div className="space-y-4">
                        <div className="h-6 w-32 bg-white/5 rounded-full" />
                        <div className="h-12 w-64 bg-white/5 rounded-xl" />
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column Skeleton */}
                    <div className="lg:col-span-8 space-y-8">
                        <Card className="border-white/5 bg-white/[0.02] h-[300px] rounded-[2rem]" />
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="h-48 border-white/5 bg-white/[0.02] rounded-3xl" />
                            <Card className="h-48 border-white/5 bg-white/[0.02] rounded-3xl" />
                            <Card className="h-48 border-white/5 bg-white/[0.02] rounded-3xl" />
                            <Card className="h-48 border-white/5 bg-white/[0.02] rounded-3xl" />
                        </div>
                    </div>

                    {/* Right Column Skeleton */}
                    <div className="lg:col-span-4 space-y-8">
                        <Card className="h-64 border-white/5 bg-white/[0.02] rounded-[2rem]" />
                        <Card className="h-64 border-white/5 bg-white/[0.02] rounded-[2rem]" />
                    </div>
                </div>
            </main>
        </div>
    );
}
