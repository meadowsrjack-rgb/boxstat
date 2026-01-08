import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileDown, Users, ClipboardCheck, Share2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import DOMPurify from "dompurify";
import uyplogoUrl from "@assets/UYP Logo nback.png";

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
  leadId: number | null;
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
  preselectedLeadId?: number;
  readOnly?: boolean;
  existingEvaluation?: any;
}

export default function LeadEvaluationForm({ onClose, preselectedLeadId, readOnly = false, existingEvaluation }: LeadEvaluationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get coach's full name
  const coachName = user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || 'Coach' : 'Coach';
  
  const [formData, setFormData] = useState<EvaluationFormData>({
    leadId: preselectedLeadId || null,
    playerName: "",
    programAttended: "",
    programRecommended: "",
    evaluationDate: new Date(),
    evaluator: coachName,
    skillScores: SKILL_CATEGORIES.reduce((acc, skill) => ({ ...acc, [skill.name]: 3 }), {}),
    notes: ""
  });

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Fetch leads from CRM
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/crm/leads'],
  });
  
  // Fetch programs
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ['/api/programs'],
  });
  
  // Load existing evaluation data
  useEffect(() => {
    if (existingEvaluation) {
      setFormData({
        leadId: existingEvaluation.leadId || null,
        playerName: existingEvaluation.playerName || "",
        programAttended: existingEvaluation.programAttended || "",
        programRecommended: existingEvaluation.programRecommended || "",
        evaluationDate: existingEvaluation.evaluationDate ? new Date(existingEvaluation.evaluationDate) : new Date(),
        evaluator: existingEvaluation.evaluator || coachName,
        skillScores: existingEvaluation.skillScores || SKILL_CATEGORIES.reduce((acc, skill) => ({ ...acc, [skill.name]: 3 }), {}),
        notes: existingEvaluation.notes || ""
      });
    }
  }, [existingEvaluation, coachName]);
  
  // When lead is selected, auto-fill player name
  useEffect(() => {
    if (formData.leadId && leads.length > 0) {
      const selectedLead = leads.find(l => l.id === formData.leadId);
      if (selectedLead) {
        setFormData(prev => ({
          ...prev,
          playerName: `${selectedLead.firstName} ${selectedLead.lastName}`
        }));
      }
    }
  }, [formData.leadId, leads]);
  
  // Save evaluation mutation
  const saveEvaluationMutation = useMutation({
    mutationFn: async (data: EvaluationFormData) => {
      if (!data.leadId) throw new Error('No lead selected');
      return apiRequest(`/api/crm/leads/${data.leadId}/evaluation`, {
        method: 'PATCH',
        data: {
          playerName: data.playerName,
          programAttended: data.programAttended,
          programRecommended: data.programRecommended,
          evaluationDate: data.evaluationDate?.toISOString(),
          evaluator: data.evaluator,
          skillScores: data.skillScores,
          notes: data.notes
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      toast({ title: "Evaluation saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to save evaluation", description: error.message, variant: "destructive" });
    }
  });

  const handleSkillScoreChange = (skillName: string, value: number[]) => {
    setFormData(prev => ({
      ...prev,
      skillScores: {
        ...prev.skillScores,
        [skillName]: value[0]
      }
    }));
  };

  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const generatePDFBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    try {
      // Create a temporary div with the evaluation template
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '8.5in';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '40px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      
      const htmlContent = `
        <!-- Player Information with Logo -->
        <div style="display: flex; margin-bottom: 10px;">
          <div style="flex: 2; margin-right: 10px;">
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; width: 150px; font-size: 12px;">Player Name:</td>
                <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${escapeHtml(formData.playerName)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Program Attended:</td>
                <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${escapeHtml(formData.programAttended)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Program Recommended:</td>
                <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${escapeHtml(formData.programRecommended)}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Date:</td>
                <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${formData.evaluationDate ? format(formData.evaluationDate, 'MM/dd/yy') : ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Evaluator(s):</td>
                <td style="padding: 8px; border: 1px solid #000; font-size: 12px;">${escapeHtml(formData.evaluator)}</td>
              </tr>
            </table>
          </div>
          <div style="flex: 1; display: flex; align-items: center; justify-content: center; border: 2px solid #000; background: #f0f0f0;">
            <img src="${uyplogoUrl}" alt="BoxStat Logo" style="height: 300px; width: auto; object-fit: contain;" />
          </div>
        </div>
        
        <!-- Skills Evaluation -->
        <div style="margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              ${SKILL_CATEGORIES.map(skill => `
                <td style="padding: 8px; border: 1px solid #000; text-align: center; background: #dc2626; color: white; font-weight: bold; font-size: 12px;">
                  ${skill.name}${skill.name === 'DEFENSE' ? '<br>(if applicable)' : ''}
                </td>
              `).join('')}
            </tr>
            <tr>
              ${SKILL_CATEGORIES.map(skill => `
                <td style="padding: 15px 8px; border: 1px solid #000; text-align: center; font-size: 12px; font-weight: bold;">
                  ${formData.skillScores[skill.name] || 1}
                </td>
              `).join('')}
            </tr>
          </table>
        </div>
        
        <!-- Notes -->
        <div style="margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Notes:</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #000; min-height: 40px; font-size: 12px;">
                ${escapeHtml(formData.notes || '')}
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Guidelines and Roadmap -->
        <div style="display: flex; gap: 10px;">
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">General Scoring Guidelines*:</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #000; font-size: 12px; line-height: 1.4;">
                  <div style="margin-bottom: 8px;"><strong>Club = 20 - 30</strong></div>
                  <div style="margin-bottom: 8px;"><strong>FNH = 11 - 19</strong></div>
                  <div style="margin-bottom: 12px;"><strong>Skills = 1 - 10</strong></div>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="flex: 1;">
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
              <tr>
                <td style="padding: 8px; border: 1px solid #000; background: #f0f0f0; font-weight: bold; font-size: 12px;">Growth Roadmap:</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #000; font-size: 12px; line-height: 1.4;">
                  <div style="margin-bottom: 15px;">
                    BoxStat coaches will reevaluate your player after 30 days to assess their progress. Depending on the growth shown and needed, coaches will determine the next level they will graduate to. Here is an overview of the next levels we graduate our players to:
                  </div>
                  <div style="text-align: center; font-style: italic; color: #dc2626; font-weight: bold;">
                    <em>Rookies >> Skills Academy >> FNH >> Club >> High School</em>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Disclaimer Section -->
        <div style="margin-top: 10px;">
          <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
            <tr>
              <td style="padding: 12px; border: 1px solid #000; font-size: 12px; line-height: 1.4;">
                <div style="margin-bottom: 10px;">
                  <strong>Disclaimer*</strong> Players are evaluated by one or more of the coaches present on the court from a scale from 1-5; 5 being club level, 3 as good foundations, and 1 as developing. Please keep in mind that the coaches might not have their eye on your player(s) for the full duration of the practice, and the skills focused on during practice might not have highlighted some or most of these evaluated skills. We provide this free assessment solely for you and your player to get a better grasp of what they need to focus towards their basketball development journey.
                </div>
                <div>
                  *We will recommend a court based off of these standard guidelines. These are not strict standards to meet certain program requirements.
                </div>
              </td>
            </tr>
          </table>
        </div>
      `;
      
      tempDiv.innerHTML = DOMPurify.sanitize(htmlContent);
      
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
      
      // Get PDF as blob
      const blob = pdf.output('blob');
      const fileName = `Coach Evaluation - ${formData.playerName}.pdf`;
      
      return { blob, fileName };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const result = await generatePDFBlob();
      if (result) {
        const { blob, fileName } = result;
        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sharePDF = async () => {
    if (!navigator.share) {
      alert('Sharing is not supported on this device. Please use the Export PDF button instead.');
      return;
    }

    setIsSharing(true);
    
    try {
      const result = await generatePDFBlob();
      if (!result) {
        alert('Failed to generate PDF');
        return;
      }

      const { blob, fileName } = result;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      await navigator.share({
        files: [file],
        title: 'Coach Evaluation',
        text: `Coach evaluation for ${formData.playerName}`
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing PDF:', error);
        alert('Failed to share PDF. Please try downloading instead.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const isFormValid = formData.leadId && formData.programAttended && formData.programRecommended && formData.evaluationDate;

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
            <Select 
              value={formData.leadId?.toString() || ""} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, leadId: parseInt(value) }))}
              disabled={readOnly || !!preselectedLeadId}
            >
              <SelectTrigger data-testid="select-lead">
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead: any) => (
                  <SelectItem key={lead.id} value={lead.id.toString()}>
                    {lead.firstName} {lead.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leads.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No leads available. Create leads in Admin Dashboard &gt; CRM first.</p>
            )}
          </div>

          <div>
            <Label htmlFor="programAttended">Program Attended *</Label>
            <Select 
              value={formData.programAttended} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, programAttended: value }))}
              disabled={readOnly}
            >
              <SelectTrigger data-testid="select-program-attended">
                <SelectValue placeholder="Select program attended" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program: any) => (
                  <SelectItem key={program.id} value={program.name}>{program.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="programRecommended">Program Recommended *</Label>
            <Select 
              value={formData.programRecommended} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, programRecommended: value }))}
              disabled={readOnly}
            >
              <SelectTrigger data-testid="select-program-recommended">
                <SelectValue placeholder="Select recommended program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program: any) => (
                  <SelectItem key={program.id} value={program.name}>{program.name}</SelectItem>
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
                  disabled={readOnly}
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
              readOnly
              className="bg-gray-50"
              data-testid="input-evaluator"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-populated from your coach profile</p>
          </div>
        </CardContent>
      </Card>

      {/* Skill Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Evaluations</CardTitle>
          <p className="text-sm text-gray-600">Rate each skill from 1 (needs work) to 5 (excellent)</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                disabled={readOnly}
                data-testid={`slider-${skill.name.toLowerCase()}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
            disabled={readOnly}
            data-testid="textarea-notes"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-3">
          <Button
            onClick={sharePDF}
            disabled={!isFormValid || isSharing}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            data-testid="button-share-pdf"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? "Preparing..." : "Share"}
          </Button>
          <Button
            onClick={generatePDF}
            disabled={!isFormValid || isGeneratingPDF}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50"
            data-testid="button-generate-pdf"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? "Generating..." : "Export as PDF"}
          </Button>
          <Button
            onClick={() => saveEvaluationMutation.mutate(formData)}
            disabled={!formData.leadId || !isFormValid || saveEvaluationMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
            data-testid="button-save-evaluation"
          >
            {saveEvaluationMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveEvaluationMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}