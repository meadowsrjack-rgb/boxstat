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
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
          <div style="flex: 1;">
            <div style="border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 8px; border-radius: 8px; background-color: #f9fafb; font-size: 14px;">
              <strong style="color: #1f2937;">Player Name:</strong> <span style="color: #374151;">${formData.playerName}</span>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 8px; border-radius: 8px; background-color: #f9fafb; font-size: 14px;">
              <strong style="color: #1f2937;">Program Attended:</strong> <span style="color: #374151;">${formData.programAttended}</span>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 8px; border-radius: 8px; background-color: #f9fafb; font-size: 14px;">
              <strong style="color: #1f2937;">Program Recommended:</strong> <span style="color: #374151;">${formData.programRecommended}</span>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 12px; margin-bottom: 8px; border-radius: 8px; background-color: #f9fafb; font-size: 14px;">
              <strong style="color: #1f2937;">Date:</strong> <span style="color: #374151;">${formData.evaluationDate ? format(formData.evaluationDate, 'MM/dd/yy') : ''}</span>
            </div>
            <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; background-color: #f9fafb; font-size: 14px;">
              <strong style="color: #1f2937;">Evaluator(s):</strong> <span style="color: #374151;">${formData.evaluator}</span>
            </div>
          </div>
          <div style="width: 800px; height: 560px; margin-left: 30px; display: flex; align-items: center; justify-content: center; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <img src="${uyplogoUrl}" alt="UYP Logo" style="max-width: 90%; max-height: 90%; object-fit: contain;" />
          </div>
        </div>
        
        <div style="display: flex; margin-bottom: 25px; gap: 4px;">
          ${SKILL_CATEGORIES.map(skill => `
            <div style="flex: 1; border: 1px solid #e5e7eb; text-align: center; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);">
              <div style="background-color: #dc2626; 
                           color: white; padding: 12px; font-weight: bold; font-size: 14px;">
                ${skill.name}${skill.name === 'DEFENSE' ? ' (if applicable)' : ''}
              </div>
              <div style="padding: 20px; font-size: 24px; font-weight: bold; color: #1f2937; background-color: #ffffff;">
                ${formData.skillScores[skill.name] || 3}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 25px; border-radius: 8px; background-color: #f9fafb;">
          <strong style="color: #1f2937; font-size: 14px;">Notes:</strong><br>
          <div style="margin-top: 8px; color: #374151; font-size: 14px; line-height: 1.6;">
            ${formData.notes || 'No additional notes provided.'}
          </div>
        </div>
        
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; background-color: #f9fafb;">
              <div style="font-weight: bold; color: #dc2626; margin-bottom: 15px; font-size: 16px; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">General Scoring Guidelines*:</div>
              <div style="margin-bottom: 8px; color: #1f2937; font-size: 14px;"><strong>Club = 20 - 30</strong></div>
              <div style="margin-bottom: 8px; color: #1f2937; font-size: 14px;"><strong>FNH = 11 - 19</strong></div>
              <div style="margin-bottom: 15px; color: #1f2937; font-size: 14px;"><strong>Skills = 1 - 10</strong></div>
              <div style="color: #6b7280; font-size: 12px; line-height: 1.5;">
                <strong>Disclaimer:</strong> Players are evaluated by one or more of the coaches present on the court from a scale from 1-5; 5 being club-level. As good foundations, and 1 as needs more work. Please keep in mind that coaches might not have highlighted some or most of all these assessments, especially for new players. We provide this assessment solely for that player(s) for the full duration of the practice, and the skills focused on during practice might not have highlighted some or most of all these needs. We strongly recommend to assist that player's needs to focus towards their basketball development journey.
              </div>
              <br>
              <div style="color: #6b7280; font-size: 12px; line-height: 1.5;">
                "We will recommend a court based off of these standard guidelines. These are not standards to meet certain program requirements."
              </div>
            </div>
          </div>
          <div style="flex: 1;">
            <div style="border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; background-color: #f9fafb;">
              <div style="font-weight: bold; color: #dc2626; margin-bottom: 15px; font-size: 16px; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">Growth Roadmap:</div>
              <div style="margin-bottom: 15px; color: #374151; font-size: 14px; line-height: 1.6;">UYP coaches will reevaluate your player after 30 days to assess their progress. Depending on the growth shown and overall skill level, coaches will determine the next level they will graduate to. Here is an overview of the next levels we graduate our players to:</div>
              <div style="text-align: center; font-weight: bold; color: #dc2626; font-size: 14px; background-color: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #dc2626; line-height: 2;">
                Rookies<br>
                >><br>
                Skills Academy<br>
                >><br>
                FNH<br>
                >><br>
                Club<br>
                >><br>
                High School
              </div>
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