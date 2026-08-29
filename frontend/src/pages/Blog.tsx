import { Link } from "react-router-dom";
import { Header } from "@/components/ui/header-1";
import { Footer } from "@/components/ui/footer";
import { posts, categoryColors } from "@/data/blogPosts";

export function Blog() {
  return (
    <div className="w-full min-h-screen bg-white">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          ← Back to Home
        </Link>

        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-gray-600 text-lg">
            Insights on heat-safe dispatching, route optimization, and fleet operations.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md hover:border-orange-200 transition-all"
            >
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? "bg-gray-100 text-gray-700"}`}>
                    {post.category}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-2 leading-snug group-hover:text-orange-600 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 flex-1 mb-4">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
                  <span>{post.date}</span>
                  <span className="flex items-center gap-1">
                    {post.readTime}
                    <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform inline-block">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
