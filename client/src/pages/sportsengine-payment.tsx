import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, Shield, Clock } from "lucide-react";

const paymentOptions = {
  registration: {
    title: "League Registration",
    description: "Secure your spot in the UYP Basketball League",
    items: [
      { name: "Registration Fee", price: 150, required: true },
      { name: "Insurance Coverage", price: 25, required: true },
      { name: "Processing Fee", price: 5, required: true }
    ],
    total: 180
  },
  uniform: {
    title: "Team Uniform Package",
    description: "Official UYP Basketball uniform and gear",
    items: [
      { name: "Team Jersey", price: 35, required: true },
      { name: "Team Shorts", price: 25, required: true },
      { name: "Team Socks", price: 10, required: false },
      { name: "Warm-up Shirt", price: 30, required: false }
    ],
    total: 60 // Required items only
  },
  tournament: {
    title: "Tournament Entry",
    description: "Entry fee for upcoming tournaments",
    items: [
      { name: "Tournament Entry Fee", price: 75, required: true },
      { name: "Facility Fee", price: 15, required: true },
      { name: "Referee Fee", price: 10, required: true }
    ],
    total: 100
  },
  camps: {
    title: "Skills Development Camps",
    description: "Intensive training camps with professional coaches",
    items: [
      { name: "Summer Skills Camp (Week 1)", price: 120, required: false },
      { name: "Summer Skills Camp (Week 2)", price: 120, required: false },
      { name: "Shooting Fundamentals", price: 80, required: false },
      { name: "Defensive Techniques", price: 80, required: false }
    ],
    total: 0 // All optional
  }
};

export default function SportsEnginePayment() {
  const [params] = useRoute("/payment/:type?");
  const navigate = useNavigate();
  const paymentType = params?.type || "registration";
  
  const [selectedItems, setSelectedItems] = useState<string[]>(() => {
    const option = paymentOptions[paymentType as keyof typeof paymentOptions];
    return option?.items.filter(item => item.required).map(item => item.name) || [];
  });

  const currentOption = paymentOptions[paymentType as keyof typeof paymentOptions];

  if (!currentOption) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Payment Option Not Found</h2>
            <p className="text-gray-600 mb-4">The requested payment option is not available.</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleItem = (itemName: string) => {
    const item = currentOption.items.find(i => i.name === itemName);
    if (item?.required) return; // Can't toggle required items

    setSelectedItems(prev => 
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const calculateTotal = () => {
    return currentOption.items
      .filter(item => selectedItems.includes(item.name))
      .reduce((sum, item) => sum + item.price, 0);
  };

  const handlePayment = () => {
    // In a real implementation, this would redirect to SportsEngine payment portal
    const total = calculateTotal();
    const items = selectedItems.join(", ");
    
    // This would typically construct a SportsEngine payment URL with the selected items
    alert(`Redirecting to SportsEngine for payment of $${total} for: ${items}`);
    
    // For now, we'll just simulate a successful payment
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" data-testid="sportsengine-payment-page">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6" data-testid="header-section">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold ml-2">Secure Payment</h1>
        </div>

        {/* Payment Option Card */}
        <Card className="mb-6" data-testid="card-payment-option">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" data-testid="text-payment-title">
              <CreditCard className="w-5 h-5" />
              {currentOption.title}
            </CardTitle>
            <CardDescription data-testid="text-payment-description">
              {currentOption.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="payment-items-list">
              {currentOption.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.name)}
                      onChange={() => toggleItem(item.name)}
                      disabled={item.required}
                      className="w-4 h-4 rounded border-gray-300"
                      data-testid={`checkbox-item-${index}`}
                    />
                    <div>
                      <p className="font-medium text-sm" data-testid={`text-item-name-${index}`}>
                        {item.name}
                      </p>
                      {item.required && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-required-${index}`}>
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold" data-testid={`text-item-price-${index}`}>
                    ${item.price}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center text-lg font-bold" data-testid="total-section">
              <span>Total:</span>
              <span data-testid="text-total-amount">${calculateTotal()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Security & Info */}
        <Card className="mb-6" data-testid="card-security-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Shield className="w-4 h-4 text-green-600" />
              <span data-testid="text-security-info">
                Secure payment processing powered by SportsEngine
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span data-testid="text-processing-info">
                Payments are processed instantly
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Button */}
        <Button 
          onClick={handlePayment}
          className="w-full py-3 text-lg font-semibold"
          disabled={calculateTotal() === 0}
          data-testid="button-pay"
        >
          Pay ${calculateTotal()} with SportsEngine
        </Button>

        <p className="text-xs text-gray-500 text-center mt-4" data-testid="text-payment-disclaimer">
          You will be redirected to SportsEngine's secure payment portal to complete your transaction.
        </p>
      </div>
    </div>
  );
}