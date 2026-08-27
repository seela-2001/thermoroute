"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DEFAULT_FAQS = [
  {
    question: "What is ThermoDispatch?",
    answer: "ThermoDispatch is a route planning tool that analyzes weather conditions, road visibility, and heat exposure across your entire route. It helps you choose the safest path for your crew by comparing alternatives based on real-time and forecasted conditions.",
  },
  {
    question: "How accurate are the weather and road condition forecasts?",
    answer: "We combine data from multiple weather services, DOT road cameras, and traffic monitoring systems. Our forecasts are updated hourly and provide route-specific timing so you know exactly when conditions will change along your journey.",
  },
  {
    question: "Can I save routes for regular trips?",
    answer: "Yes! You can pin any route and get automatic alerts when conditions change. Perfect for daily commutes, weekend trips to family, or routes to vacation spots you visit regularly.",
  },
  {
    question: "Does this work for all types of vehicles?",
    answer: "ThermoDispatch is designed for all road vehicles. Our heat exposure and road condition analysis is particularly valuable for fleets, delivery trucks, and anyone who needs to keep passengers comfortable and safe.",
  },
  {
    question: "Is there a free trial?",
    answer: "You can try ThermoDispatch right here to see how it works. We offer flexible plans for individuals and fleets, all starting with a free trial so you can experience the benefits firsthand.",
  },
];

interface FaqSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  items?: {
    question: string;
    answer: string;
  }[];
  contactInfo?: {
    title: string;
    description: string;
    buttonText: string;
    onContact?: () => void;
  };
}

const FaqSection = React.forwardRef<HTMLElement, FaqSectionProps>(
  ({ className, title = "Frequently Asked Questions", description = "Everything you need to know about ThermoDispatch", items = DEFAULT_FAQS, contactInfo, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "py-16 w-full bg-gradient-to-b from-transparent via-gray-50/50 to-transparent",
          className
        )}
        {...props}
      >
        <div className="mx-auto max-w-2xl px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-semibold mb-3 text-gray-900">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </motion.div>

          {/* FAQ Items */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                index={index}
              />
            ))}
          </div>

          {/* Contact Section */}
          {contactInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-md mx-auto mt-12 p-6 rounded-lg border border-gray-200 bg-white text-center"
            >
              <div className="inline-flex items-center justify-center p-1.5 rounded-full mb-4">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {contactInfo.title}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {contactInfo.description}
              </p>
              <Button size="sm" onClick={contactInfo.onContact}>
                {contactInfo.buttonText}
              </Button>
            </motion.div>
          )}
        </div>
      </section>
    );
  }
);
FaqSection.displayName = "FaqSection";

// Internal FaqItem component
const FaqItem = React.forwardRef<
  HTMLDivElement,
  {
    question: string;
    answer: string;
    index: number;
  }
>((props, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { question, answer, index } = props;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.1 }}
      className={cn(
        "group rounded-lg",
        "transition-all duration-200 ease-in-out",
        "border border-gray-200",
        isOpen
          ? "bg-gradient-to-br from-white via-gray-50/50 to-white"
          : "hover:bg-gray-50/50"
      )}
    >
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 h-auto justify-between hover:bg-transparent"
      >
        <h3
          className={cn(
            "text-base font-medium transition-colors duration-200 text-left",
            "text-gray-600",
            isOpen && "text-gray-900"
          )}
        >
          {question}
        </h3>
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={cn(
            "p-0.5 rounded-full flex-shrink-0",
            "transition-colors duration-200",
            isOpen ? "text-gray-900" : "text-gray-400"
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </Button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: { duration: 0.2, ease: "easeOut" },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: { duration: 0.2, ease: "easeIn" },
            }}
          >
            <div className="px-6 pb-4 pt-2">
              <motion.p
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="text-sm text-gray-500 leading-relaxed"
              >
                {answer}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
FaqItem.displayName = "FaqItem";

export { FaqSection };
export const FAQ = FaqSection;