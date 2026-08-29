import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/ui/header-1";
import { Footer } from "@/components/ui/footer";
import { posts, categoryColors } from "@/data/blogPosts";

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="w-full min-h-screen bg-white">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link to="/blog" className="text-orange-500 hover:underline">← Back to Blog</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const others = posts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <div className="w-full min-h-screen bg-white">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-14 md:py-18">
        {/* Back */}
        <Link to="/blog" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-10 transition-colors">
          ← Back to Blog
        </Link>

        {/* Header */}
        <div className="mb-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? "bg-gray-100 text-gray-700"}`}>
            {post.category}
          </span>
          <h1 className="mt-5 text-3xl md:text-4xl font-bold text-gray-900 leading-tight tracking-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 mt-4 text-sm text-gray-400">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed border-l-4 border-orange-200 pl-4">
            {post.excerpt}
          </p>
        </div>

        {/* Divider */}
        <hr className="border-gray-100 mb-10" />

        {/* Body */}
        <div
          className="prose prose-gray prose-lg max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-p:text-gray-600 prose-p:leading-relaxed prose-p:mb-5
            prose-li:text-gray-600 prose-ul:my-4 prose-ul:pl-5
            prose-strong:text-gray-800
            prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:text-gray-700 prose-th:py-2 prose-th:pr-6
            prose-td:py-2 prose-td:pr-6 prose-td:text-gray-600 prose-tr:border-b prose-tr:border-gray-100"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Divider */}
        <hr className="border-gray-100 mt-14 mb-12" />

        {/* More posts */}
        {others.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-6">More from the blog</h2>
            <div className="flex flex-col gap-4">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  to={`/blog/${p.slug}`}
                  className="group flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[p.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {p.category}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                      {p.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{p.date} · {p.readTime}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-orange-400 transition-colors mt-1 text-lg">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
