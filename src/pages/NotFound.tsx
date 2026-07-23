import { useSeoMeta } from "@unhead/react";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "404 — Page Not Found — BitVote",
    description: "The page you are looking for could not be found.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl font-bold text-primary mb-2">404</div>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to Polls
          </Link>
        </Button>
      </div>
    </Layout>
  );
};

export default NotFound;
