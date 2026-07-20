import React from "react";
import {
  HeartPulse,
  GraduationCap,
  Leaf,
  Cpu,
  ShoppingBag,
  Music,
  LayoutGrid,
} from "lucide-react";

const CategoryCard = ({
  icon: Icon,
  title,
  description,
  examples,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  examples: string[];
}) => (
  <article className="bg-card backdrop-blur-md/85 p-7 rounded-3xl border border-border/80 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
    <div className="w-11 h-11 sage-bg rounded-xl flex items-center justify-center mb-4">
      <Icon className="text-white w-6 h-6" />
    </div>
    <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
      {title}
    </h3>
    <p className="text-muted-foreground leading-relaxed mb-4">{description}</p>
    <ul className="space-y-1.5">
      {examples.map((example, idx) => (
        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
          <span className="text-emerald-600 mt-1">•</span>
          <span>{example}</span>
        </li>
      ))}
    </ul>
  </article>
);

const categories = [
  {
    icon: HeartPulse,
    title: "Health & Wellness",
    description:
      "Fund community health initiatives, clinics, and wellness infrastructure that improve local quality of life.",
    examples: [
      "Neighborhood health clinics",
      "Mental health support centers",
      "Fitness and recreation facilities",
      "Preventive care programs",
    ],
  },
  {
    icon: GraduationCap,
    title: "Education",
    description:
      "Pool resources to support schools, training centers, and learning programs that empower the next generation.",
    examples: [
      "After-school programs",
      "Vocational training centers",
      "Community libraries",
      "Scholarship funds",
    ],
  },
  {
    icon: Leaf,
    title: "Agriculture & Food",
    description:
      "Back local farms, co-ops, and food-access projects that strengthen community food security.",
    examples: [
      "Urban farming cooperatives",
      "Community gardens",
      "Local food distribution",
      "Sustainable agriculture",
    ],
  },
  {
    icon: Cpu,
    title: "Technology",
    description:
      "Invest in tech infrastructure, digital access, and innovation hubs that close the digital divide.",
    examples: [
      "Community broadband access",
      "Maker spaces and labs",
      "Digital literacy programs",
      "Local tech startups",
    ],
  },
  {
    icon: ShoppingBag,
    title: "Retail & Commerce",
    description:
      "Support local businesses, markets, and retail ventures that create jobs and keep money in the community.",
    examples: [
      "Neighborhood markets",
      "Local business loans",
      "Retail incubator spaces",
      "Community cooperatives",
    ],
  },
  {
    icon: Music,
    title: "Arts & Entertainment",
    description:
      "Finance cultural venues, events, and creative projects that enrich community life.",
    examples: [
      "Community theaters",
      "Cultural festivals",
      "Public art installations",
      "Neighborhood event spaces",
    ],
  },
];

const Properties: React.FC = () => {
  return (
    <section id="properties" className="py-24 lg:py-28 bg-card backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 lg:mb-16">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl mb-4">
            Investment Categories
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Community DAOs fund proposals across six categories — every investment is graded,
            deadline-bound, and governed on-chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 mb-14">
          {categories.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>

        <div className="bg-card backdrop-blur-md/90 rounded-3xl p-8 md:p-10 border border-border/90 shadow-[0_8px_20px_rgba(15,23,42,0.06)] flex items-start gap-5">
          <div className="w-12 h-12 shrink-0 sage-bg rounded-xl flex items-center justify-center">
            <LayoutGrid className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-foreground mb-2">
              Proposal Grades &amp; Transparency
            </h3>
            <p className="text-muted-foreground leading-relaxed max-w-3xl">
              Every proposal carries a grade (A–D) set by admins, a funding target, a deadline, and
              supporting documents pinned to IPFS. Members see exactly what they're funding —
              before and after they stake.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Properties;
