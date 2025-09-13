import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function PollLoading() {
  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Poll options */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="flex justify-between w-full">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    </div>
  );
}