import type { Metadata } from "next";
import { Shield, Mail, Clock, Lock, HelpCircle, Building2, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "যোগাযোগ করুন — Pandecora",
  description: "Pandecora সাপোর্ট টিমের সাথে যোগাযোগ করুন।",
};

const TOPICS = [
  {
    icon: HelpCircle,
    title: "প্ল্যাটফর্ম সহায়তা",
    titleEn: "Platform support",
    desc: "রিপোর্টিং সিস্টেম বা আপনার অ্যাকাউন্ট সম্পর্কিত প্রশ্ন।",
  },
  {
    icon: Building2,
    title: "প্রতিষ্ঠানিক অ্যাক্সেস",
    titleEn: "Institutional access",
    desc: "আপনার বিশ্ববিদ্যালয়, স্কুল বা প্রতিষ্ঠান যুক্ত করা।",
  },
  {
    icon: AlertCircle,
    title: "প্রযুক্তিগত সমস্যা",
    titleEn: "Technical issues",
    desc: "বাগ, ত্রুটি বা যা ঠিকমতো কাজ করছে না।",
  },
  {
    icon: Lock,
    title: "গোপনীয়তা ও নিরাপত্তা",
    titleEn: "Privacy & security",
    desc: "আপনার তথ্য কীভাবে সুরক্ষিত রাখা হয় সে সম্পর্কিত প্রশ্ন।",
  },
];

export default function ContactPage() {
  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[420px_1fr] min-h-[calc(100vh-4rem)]">

          {/* ── Left panel (dark) ────────────────────────────────────────── */}
          <aside className="relative flex flex-col bg-[#25282b] px-8 py-14 sm:px-12 lg:px-10 lg:py-16 overflow-hidden">
            {/* dot-grid background */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
              aria-hidden="true"
            />
            {/* red top accent */}
            <div className="absolute left-0 top-0 h-1 w-full bg-[#e60000]" aria-hidden="true" />

            <div className="relative">
              {/* Brand */}
              <div className="mb-10 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e60000]">
                  <Shield size={17} className="text-white" />
                </div>
                <span className="text-sm font-bold tracking-tight text-white">
                  Pandecora
                </span>
              </div>

              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#e60000]">
                যোগাযোগ করুন (Get in touch)
              </p>
              <h1 className="text-4xl font-black uppercase leading-[0.92] tracking-tight text-white sm:text-5xl">
                আমরা এখানে<br />আছি।
              </h1>
              <p className="mt-1 text-xs font-light text-white/30">We&apos;re here to help.</p>
              <p className="mt-4 text-sm font-light leading-relaxed text-white/50">
                প্ল্যাটফর্ম সম্পর্কিত প্রশ্ন, প্রযুক্তিগত সমস্যা বা প্রতিষ্ঠানিক অ্যাক্সেস —
                আমাদের দল সাহায্য করতে প্রস্তুত।
              </p>

              {/* Topics */}
              <div className="mt-10 space-y-4">
                {TOPICS.map(({ icon: Icon, title, titleEn, desc }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/60">
                      <Icon size={15} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-[11px] text-white/30">{titleEn}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/40">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="my-10 h-px w-full bg-white/10" />

              {/* Meta info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <Mail size={13} className="shrink-0" />
                  শুধুমাত্র সাধারণ অনুসন্ধানের জন্য — অভিযোগ রিপোর্টের জন্য নয়
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <Clock size={13} className="shrink-0" />
                  আমরা সাধারণত এক কার্যদিবসের মধ্যে উত্তর দিই
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <Lock size={13} className="shrink-0" />
                  প্রতি ঘণ্টায় সর্বোচ্চ ৩টি বার্তা — স্প্যাম নিষিদ্ধ
                </div>
              </div>

              {/* CTA for reports */}
              <div className="mt-10 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs font-bold text-white">
                  অভিযোগ রিপোর্ট করতে চান?
                </p>
                <p className="text-[11px] text-white/30">Need to report an incident?</p>
                <p className="mt-1 text-xs leading-relaxed text-white/40">
                  এই ফর্মটি শুধুমাত্র সাধারণ অনুসন্ধানের জন্য। সুরক্ষিত অভিযোগ রিপোর্ট জমা দিতে:
                </p>
                <a
                  href="/signup"
                  className="mt-3 inline-block rounded-lg bg-[#e60000] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#cc0000]"
                >
                  অ্যাকাউন্ট তৈরি করুন →
                </a>
              </div>
            </div>
          </aside>

          {/* ── Right panel (form) ────────────────────────────────────────── */}
          <section className="flex items-center justify-center px-6 py-14 sm:px-12 lg:px-16">
            <div className="w-full max-w-lg">
              <h2 className="text-2xl font-black text-[#25282b]">আমাদের বার্তা পাঠান</h2>
              <p className="text-xs text-[#7e7e7e] mt-0.5">Send us a message</p>
              <p className="mt-2 mb-8 text-sm text-[#7e7e7e]">
                নিচের ফর্মটি পূরণ করুন, আমরা যত দ্রুত সম্ভব উত্তর দেব।
              </p>
              <ContactForm />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
