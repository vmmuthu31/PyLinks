"use client";

import { useState } from "react";
import { 
  HelpCircle, 
  Search, 
  Book, 
  MessageCircle, 
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Wallet,
  Users,
  Shield,
  Zap,
  Gift,
  FileText,
  Video,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface GuideItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
  duration: string;
}

export default function Help() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: "1",
      question: "How do I create my first payment?",
      answer: "Go to Payments > Create Payment, enter the merchant address, amount, and description. You can also add payment splits and referral codes. The system will generate a QR code and payment link that expires in 10 minutes.",
      category: "payments"
    },
    {
      id: "2",
      question: "What are bulk payments and how do they work?",
      answer: "Bulk payments allow you to send multiple payments in a single transaction. You can send to a single merchant (multiple amounts) or multiple merchants. This saves on gas fees and time. Go to Bulk Payments to get started.",
      category: "payments"
    },
    {
      id: "3",
      question: "How do escrow payments protect buyers?",
      answer: "Escrow payments hold funds in a smart contract for 7 days, allowing time for dispute resolution. The buyer can release payment early if satisfied, or dispute if there are issues. This provides protection for both parties.",
      category: "payments"
    },
    {
      id: "4",
      question: "How do I connect my wallet?",
      answer: "PyLinks automatically creates an embedded wallet for merchants during signup. You can also connect external wallets like MetaMask. Go to Profile to manage your wallet connections.",
      category: "wallet"
    },
    {
      id: "5",
      question: "What fees does PyLinks charge?",
      answer: "PyLinks charges a 0.1% platform fee on all transactions. This fee is automatically deducted from payments. There are no monthly fees or setup costs.",
      category: "fees"
    },
    {
      id: "6",
      question: "How does the affiliate program work?",
      answer: "Earn 20% of platform fees from users you refer. Higher tiers (Silver, Gold, Diamond) offer increased rewards up to 35%. Register in the Affiliates section to get your referral code.",
      category: "affiliates"
    },
    {
      id: "7",
      question: "What is Spin & Win?",
      answer: "Earn 1 spin credit for every $1 in payments processed. Spin to win PYUSD rewards, loyalty points, and unlock exclusive merchant benefits. Access it from the Gamification section.",
      category: "gamification"
    },
    {
      id: "8",
      question: "How do subscriptions work?",
      answer: "Create recurring payment subscriptions with flexible intervals (daily, weekly, monthly, yearly). Uses USD pricing via Pyth oracles for stable pricing. Perfect for SaaS and membership businesses.",
      category: "subscriptions"
    },
    {
      id: "9",
      question: "Is my data secure?",
      answer: "Yes! PyLinks uses enterprise-grade security with encrypted data storage, secure wallet connections, and smart contract audits. We never store private keys and follow best security practices.",
      category: "security"
    },
    {
      id: "10",
      question: "How do I export my transaction data?",
      answer: "Go to Wallet > Transaction History and click 'Export CSV' to download your complete transaction history. You can also export data from Settings > Data Management.",
      category: "data"
    }
  ];

  const guides: GuideItem[] = [
    {
      id: "1",
      title: "Getting Started with PyLinks",
      description: "Complete setup guide for new merchants",
      icon: Book,
      category: "basics",
      duration: "5 min"
    },
    {
      id: "2",
      title: "Creating Your First Payment",
      description: "Step-by-step payment creation tutorial",
      icon: DollarSign,
      category: "payments",
      duration: "3 min"
    },
    {
      id: "3",
      title: "Setting Up Bulk Payments",
      description: "Efficiently manage multiple payments",
      icon: Users,
      category: "payments",
      duration: "7 min"
    },
    {
      id: "4",
      title: "Wallet Management Guide",
      description: "Send, receive, and track your PYUSD",
      icon: Wallet,
      category: "wallet",
      duration: "4 min"
    },
    {
      id: "5",
      title: "Maximizing Affiliate Earnings",
      description: "Grow your referral income",
      icon: Users,
      category: "affiliates",
      duration: "6 min"
    },
    {
      id: "6",
      title: "Security Best Practices",
      description: "Keep your account and funds safe",
      icon: Shield,
      category: "security",
      duration: "8 min"
    }
  ];

  const categories = [
    { id: "all", name: "All Topics", count: faqs.length },
    { id: "payments", name: "Payments", count: faqs.filter(f => f.category === "payments").length },
    { id: "wallet", name: "Wallet", count: faqs.filter(f => f.category === "wallet").length },
    { id: "affiliates", name: "Affiliates", count: faqs.filter(f => f.category === "affiliates").length },
    { id: "security", name: "Security", count: faqs.filter(f => f.category === "security").length },
    { id: "fees", name: "Fees", count: faqs.filter(f => f.category === "fees").length }
  ];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <HelpCircle className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and learn how to use PyLinks
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for help articles, guides, or FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get instant help from our support team
            </p>
            <Button size="sm" className="w-full">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Send us a detailed message
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Video className="h-8 w-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold mb-2">Video Tutorials</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Watch step-by-step guides
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Watch Videos
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Getting Started Guides
          </CardTitle>
          <CardDescription>
            Step-by-step tutorials to help you master PyLinks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guides.map((guide) => (
              <div key={guide.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <guide.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{guide.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {guide.duration}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {guide.description}
                    </p>
                    <Button size="sm" variant="ghost" className="p-0 h-auto">
                      Read Guide <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {category.count}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* FAQ List */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              {filteredFAQs.length} questions found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No FAQs found matching your search</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFAQs.map((faq) => (
                  <Collapsible
                    key={faq.id}
                    open={openFAQ === faq.id}
                    onOpenChange={(open) => setOpenFAQ(open ? faq.id : null)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-left">{faq.question}</span>
                        {openFAQ === faq.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Support */}
      <Alert>
        <MessageCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Can't find what you're looking for? Our support team is here to help 24/7.
            </span>
            <Button size="sm" className="ml-4">
              Contact Support
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>
            More ways to learn and get help with PyLinks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-medium">API Documentation</h4>
                <p className="text-sm text-muted-foreground">
                  Technical documentation for developers
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Download className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium">Mobile App</h4>
                <p className="text-sm text-muted-foreground">
                  Download PyLinks for iOS and Android
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <div>
                <h4 className="font-medium">Community Forum</h4>
                <p className="text-sm text-muted-foreground">
                  Connect with other PyLinks users
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <h4 className="font-medium">Security Center</h4>
                <p className="text-sm text-muted-foreground">
                  Learn about security best practices
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
