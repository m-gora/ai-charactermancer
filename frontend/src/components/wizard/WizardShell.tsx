import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  LinearProgress,
} from '@mui/material';
import { useState, type ComponentType } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useCharacterStore } from '../../store/characterStore';
import { STEPS } from './StepRegistry';
import { RaceStep } from './steps/RaceStep';
import { ClassStep } from './steps/ClassStep';
import { AttributesStep } from './steps/AttributesStep';
import { FeatsStep } from './steps/FeatsStep';
import { SummaryStep } from './steps/SummaryStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { TraitsStep } from './steps/TraitsStep';
import { SkillsStep } from './steps/SkillsStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { SidekickPanel } from '../sidekick/SidekickPanel';
import { apiFetch } from '../../api/client';

const STEP_COMPONENTS: ComponentType[] = [
  BasicInfoStep,
  RaceStep,
  ClassStep,
  AttributesStep,
  SkillsStep,
  FeatsStep,
  TraitsStep,
  EquipmentStep,
  SummaryStep,
];

const LAST_STEP = STEPS.length - 1;

/**
 * Renders the active wizard step with a progress stepper, navigation buttons,
 * autosave on step advance, and the collapsible AI sidekick panel.
 */
export function WizardShell({ onExit }: Readonly<{ onExit: () => void }>) {
  const { currentStep, setStep, draft, setDirty } = useCharacterStore();
  const { getAccessTokenSilently } = useAuth0();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const StepComponent = STEP_COMPONENTS[currentStep];
  const stepMeta = STEPS[currentStep];

  // Guard: currentStep should always be in-bounds; bail if not.
  if (!StepComponent || !stepMeta) return null;

  const isLastStep = currentStep === LAST_STEP;
  const isBeforeLastStep = currentStep === LAST_STEP - 1;

  const handleNext = async () => {
    setValidationError(null);

    // Client-side validation defined in StepRegistry
    const clientError = stepMeta.validate?.(draft) ?? null;
    if (clientError) {
      setValidationError(clientError);
      return;
    }

    let token: string;
    try {
      token = await getAccessTokenSilently();
    } catch {
      // No token — skip server-side validation but still advance
      setStep(currentStep + 1);
      return;
    }

    // Step validation (non-fatal network errors still allow advancing)
    if (!isLastStep) {
      try {
        await apiFetch('/character/validate-step', {
          method: 'POST',
          body: JSON.stringify({ step: stepMeta.path, draft }),
          token,
        });
      } catch (err) {
        const msg = (err as Error).message;
        // 422 = validation error — block advancement
        if (msg.startsWith('API 422')) {
          setValidationError(msg.replace(/^API 422:\s*/, ''));
          return;
        }
        // Any other error (e.g. backend not running yet) — allow advancing silently
      }
    }

    // Autosave in background — never blocks wizard advancement
    setSaving(true);
    (async () => {
      try {
        const saved = await apiFetch<{ id: string }>('/character/save', {
          method: 'POST',
          body: JSON.stringify(draft),
          token,
        });
        useCharacterStore.getState().setDraft({ id: saved.id });
        setDirty(false);
      } catch {
        setDirty(true);
      } finally {
        setSaving(false);
      }
    })();

    setStep(currentStep + 1);
  };

  const handleBack = () => {
    setValidationError(null);
    setStep(currentStep - 1);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      {saving && <LinearProgress color="primary" sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }} />}

      {/* Main scrollable content */}
      <Box
        sx={{
          flex: 1,
          maxWidth: 800,
          mx: 'auto',
          width: '100%',
          px: { xs: 2, sm: 3 },
          py: 4,
          // Keep right margin so content doesn't hide behind sidekick toggle tab
          pr: { xs: 6, sm: 8 },
        }}
      >
        {/* Stepper */}
        <Stepper activeStep={currentStep} sx={{ mb: 5 }} alternativeLabel>
          {STEPS.map((step, index) => (
            <Step key={step.path} completed={index < currentStep}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Active step content */}
        <Box sx={{ mb: 4 }}>
          <StepComponent />
        </Box>

        {/* Validation error */}
        {validationError && (
          <Typography color="error" sx={{ mb: 2 }} role="alert">
            {validationError}
          </Typography>
        )}

        {/* Navigation buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            disabled={currentStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {isLastStep && (
              <Button variant="outlined" onClick={onExit}>
                Back to Overview
              </Button>
            )}
            {!isLastStep && (
              <Button variant="contained" onClick={() => void handleNext()}>
                {isBeforeLastStep ? 'Finish & Review' : 'Next'}
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Sidekick — fixed to right edge */}
      <SidekickPanel currentStep={stepMeta} />
    </Box>
  );
}
