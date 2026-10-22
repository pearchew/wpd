import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

// Wide tables (the event log has eight columns) scroll inside their own box, never the page.
const components = {
  table: (props: React.ComponentProps<"table">) => (
    <div className="prose-table">
      <table {...props} />
    </div>
  ),
};

export function Prose({ source }: { source: string }) {
  return (
    <div className="prose">
      <MDXRemote source={source} components={components} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
    </div>
  );
}
