import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileDown, Users, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import uyplogoUrl from "@assets/UYP Logo nback.png";

// Program options
const PROGRAMS = [
  "Youth Club",
  "Skills Academy", 
  "FNH",
  "FNHTL",
  "High School Club"
];

// Skill categories for evaluation
const SKILL_CATEGORIES = [
  { name: "DRIBBLING", color: "bg-red-100" },
  { name: "SHOOTING", color: "bg-orange-100" },
  { name: "PASSING", color: "bg-yellow-100" },
  { name: "CATCHING", color: "bg-green-100" },
  { name: "COACHABILITY", color: "bg-blue-100" },
  { name: "DEFENSE", color: "bg-purple-100" }
];

interface EvaluationFormData {
  playerName: string;
  programAttended: string;
  programRecommended: string;
  evaluationDate: Date | null;
  evaluator: string;
  skillScores: Record<string, number>;
  notes: string;
}

interface LeadEvaluationFormProps {
  onClose?: () => void;
}

export default function LeadEvaluationForm({ onClose }: LeadEvaluationFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<EvaluationFormData>({
    playerName: "",
    programAttended: "",
    programRecommended: "",
    evaluationDate: new Date(),
    evaluator: (user as any)?.email?.split('@')[0] || "Coach",
    skillScores: SKILL_CATEGORIES.reduce((acc, skill) => ({ ...acc, [skill.name]: 3 }), {}),
    notes: ""
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleSkillScoreChange = (skillName: string, value: number[]) => {
    setFormData(prev => ({
      ...prev,
      skillScores: {
        ...prev.skillScores,
        [skillName]: value[0]
      }
    }));
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Create a temporary div with the evaluation template
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '8.5in';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '40px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      
      tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Coach</h1>
          <h1 style="font-size: 24px; font-weight: bold; margin: 0;">Evaluation</h1>
        </div>
        
        <table style="width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 0;">
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #000; font-weight: bold; width: 35%;">Player Name</td>
            <td style="padding: 8px 10px; border: 1px solid #000; border-left: none; width: 65%;">${formData.playerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #000; border-top: none; font-weight: bold;">Program Attended</td>
            <td style="padding: 8px 10px; border: 1px solid #000; border-left: none; border-top: none;">${formData.programAttended}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #000; border-top: none; font-weight: bold;">Program Recommended</td>
            <td style="padding: 8px 10px; border: 1px solid #000; border-left: none; border-top: none;">${formData.programRecommended}</td>
          </tr>
          <tr>
            <td style="padding: 8px 10px; border: 1px solid #000; border-top: none; font-weight: bold;">Prepared By</td>
            <td style="padding: 8px 10px; border: 1px solid #000; border-left: none; border-top: none; position: relative;">${formData.evaluator}
              <span style="position: absolute; right: 10px;">${formData.evaluationDate ? format(formData.evaluationDate, 'MMM dd, yyyy') : ''}</span>
            </td>
          </tr>
        </table>
        
        <div style="margin-bottom: 30px; margin-top: 40px;">
          <table style="width: 100%; border-collapse: separate; border-spacing: 8px;">
            <tr>
              ${SKILL_CATEGORIES.map(skill => `
                <td style="text-align: center; vertical-align: top;">
                  <div style="border: 1px solid #000; padding: 10px 5px; font-size: 10px; font-weight: bold;">${skill.name === 'DEFENSE' ? skill.name + '<br>(if applicable)' : skill.name}</div>
                </td>
              `).join('')}
            </tr>
            <tr>
              ${SKILL_CATEGORIES.map(skill => `
                <td style="text-align: center;">
                  <div style="border: 1px solid #000; padding: 20px 5px; font-size: 18px; font-weight: bold;">${formData.skillScores[skill.name] || 1}</div>
                </td>
              `).join('')}
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 30px;">
          <strong style="font-size: 14px;">Notes:</strong>
          <div style="border: 1px solid #000; padding: 10px; margin-top: 5px; min-height: 50px; font-size: 12px;">
            ${formData.notes || ''}
          </div>
        </div>
        
        <div style="display: flex; gap: 20px; font-size: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 10px;">General Scoring Guidelines*:</div>
            <div style="margin-bottom: 5px;"><strong>Club = 20 - 30</strong></div>
            <div style="margin-bottom: 5px;"><strong>FNH = 11 - 19</strong></div>
            <div style="margin-bottom: 15px;"><strong>Skills = 1 - 10</strong></div>
            <div style="line-height: 1.3; margin-bottom: 10px;">
              <strong>Disclaimer</strong> Players are evaluated by one or more of the coaches present on the court from a scale from 1-5; 5 being club level, 3 as good foundations, and 1 as developing. Please keep in mind that the coaches might not have their eye on your player(s) for the full duration of the practice, and the skills focused on during practice might not have highlighted some or most of these evaluated skills. We provide this free assessment solely for you and your player to get a better grasp of what they need to focus towards their basketball development journey.
            </div>
            <div style="line-height: 1.3;">
              *We will recommend a court based off of thse standard guidelines. These are not strict standards to meet certain program requirememts.
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 10px;">Growth Roadmap:</div>
            <div style="line-height: 1.3; margin-bottom: 15px;">
              UYP coaches will reevaluate your player after 30 days to assess their progress. Depending on the growth shown and needed, coaches will determine the next level they will graduate to. Here is an overview of the next levels we graduate our players to:
            </div>
            <div style="text-align: center; font-style: italic; font-weight: bold;">
              Rookies >> Skills Academy >> FNH >> Club >> High School
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      // Generate canvas from the HTML
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(tempDiv);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Download the PDF
      const fileName = `Coach Evaluation - ${formData.playerName}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const isFormValid = formData.playerName.trim() && formData.programAttended && formData.programRecommended && formData.evaluationDate;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-6 w-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900">Lead Evaluation Form</h2>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Player Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="playerName">Player Name *</Label>
              <Input
                id="playerName"
                value={formData.playerName}
                onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
                placeholder="Enter player's full name"
                data-testid="input-player-name"
              />
            </div>

            <div>
              <Label htmlFor="programAttended">Program Attended *</Label>
              <Select 
                value={formData.programAttended} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, programAttended: value }))}
              >
                <SelectTrigger data-testid="select-program-attended">
                  <SelectValue placeholder="Select program attended" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(program => (
                    <SelectItem key={program} value={program}>{program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="programRecommended">Program Recommended *</Label>
              <Select 
                value={formData.programRecommended} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, programRecommended: value }))}
              >
                <SelectTrigger data-testid="select-program-recommended">
                  <SelectValue placeholder="Select recommended program" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRAMS.map(program => (
                    <SelectItem key={program} value={program}>{program}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Evaluation Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", 
                      !formData.evaluationDate && "text-muted-foreground")}
                    data-testid="button-date-picker"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.evaluationDate ? format(formData.evaluationDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.evaluationDate || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, evaluationDate: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="evaluator">Evaluator(s)</Label>
              <Input
                id="evaluator"
                value={formData.evaluator}
                onChange={(e) => setFormData(prev => ({ ...prev, evaluator: e.target.value }))}
                placeholder="Coach name"
                data-testid="input-evaluator"
              />
            </div>
          </CardContent>
        </Card>

        {/* Skill Evaluations */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Evaluations</CardTitle>
            <p className="text-sm text-gray-600">Rate each skill from 1 (needs work) to 5 (excellent)</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {SKILL_CATEGORIES.map(skill => (
              <div key={skill.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{skill.name}</Label>
                  <span className="text-sm font-semibold text-red-600">
                    {formData.skillScores[skill.name] || 3}
                  </span>
                </div>
                <Slider
                  value={[formData.skillScores[skill.name] || 3]}
                  onValueChange={(value) => handleSkillScoreChange(skill.name, value)}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                  data-testid={`slider-${skill.name.toLowerCase()}`}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 - Needs Work</span>
                  <span>5 - Excellent</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add any additional observations, recommendations, or notes about the player..."
            rows={4}
            data-testid="textarea-notes"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={generatePDF}
          disabled={!isFormValid || isGeneratingPDF}
          className="bg-red-600 hover:bg-red-700"
          data-testid="button-generate-pdf"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isGeneratingPDF ? "Generating PDF..." : "Export as PDF"}
        </Button>
      </div>
    </div>
  );
}