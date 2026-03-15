import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Button,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect, type ComponentType } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { SidekickPanel } from '../../components/sidekick/SidekickPanel';
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
 *
 * URL scheme: /characters/:id/:step
 *   id   — character ID, or "new" before the first autosave assigns a real ID
 *   step — step path from StepRegistry (e.g. "basic-info", "race", …)
 */
export function WizardShell() {
  const { id, step } = useParams<{ id: string; step: string }>();
  const navigate = useNavigate();
  const { setDraft, draft, setDirty, reset } = useCharacterStore();
  const { getAccessTokenSilently } = useAuth0();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [charLoading, setCharLoading] = useState(false);

  // Derive numeric step index from the URL :step param
  const currentStep = STEPS.findIndex((s) => s.path === step);
  const stepMeta = STEPS[currentStep];
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Load an existing character from the API, or reset the store for a new one
  useEffect(() => {
    if (!id || id === 'new') {
      reset();
      return;
    }
    // Already loaded — skip redundant fetch
    if (draft.id === id) return;

    setCharLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const loaded = await apiFetch<Record<string, unknown>>(`/api/characters/${id}`, { token });
        if (!cancelled) {
          reset();
          setDraft(loaded as Parameters<typeof setDraft>[0]);
        }
      } catch {
        if (!cancelled) navigate('/characters', { replace: true });
      } finally {
        if (!cancelled) setCharLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to first step when :step param is missing or unrecognised
  useEffect(() => {
    if (currentStep === -1 && id) {
      navigate(`/characters/${id}/basic-info`, { replace: true });
    }
  }, [currentStep, id, navigate]);

  if (charLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!StepComponent || !stepMeta) return null;

  const isLastStep = currentStep === LAST_STEP;
  const isBeforeLastStep = currentStep === LAST_STEP - 1;
  const charId = id ?? 'new';

  const goToStep = (index: number, overrideId?: string) => {
    const stepPath = STEPS[index]?.path ?? STEPS[0]!.path;
    navigate(`/characters/${overrideId ?? charId}/${stepPath}`);
  };

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
      goToStep(currentStep + 1);
      return;
    }

    // Step validation (non-fatal network errors still allow advancing)
    if (!isLastStep) {
      try {
        await apiFetch('/api/characters/validate-step', {
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

    // Navigate immediately — autosave runs in background without blocking
    const nextStepPath = STEPS[currentStep + 1]?.path ?? '';
    goToStep(currentStep + 1);

    setSaving(true);
    (async () => {
      try {
        const saved = await apiFetch<{ id: string }>('/api/characters/save', {
          method: 'POST',
          body: JSON.stringify(draft),
          token,
        });
        useCharacterStore.getState().setDraft({ id: saved.id });
        setDirty(false);
        // If character had no ID yet, swap "new" for the real ID in the URL
        if (charId === 'new') {
          navigate(`/characters/${saved.id}/${nextStepPath}`, { replace: true });
        }
      } catch {
        setDirty(true);
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleBack = () => {
    setValidationError(null);
    goToStep(currentStep - 1);
  };

  /**
   * Final step: mark the character as complete, persist, then return to overview.
   * Navigates away even if the save fails so the user is never stuck.
   */
  const handleFinish = async () => {
    setSaving(true);
    try {
      const token = await getAccessTokenSilently();
      const finalDraft = { ...draft, status: 'complete' as const };
      const saved = await apiFetch<{ id: string }>('/api/characters/save', {
        method: 'POST',
        body: JSON.stringify(finalDraft),
        token,
      });
      useCharacterStore.getState().setDraft({ id: saved.id, status: 'complete' });
      setDirty(false);
    } catch {
      // Save failed — still exit; the draft is preserved from autosave
    } finally {
      setSaving(false);
    }
    navigate('/characters');
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
        <Stepper activeStep={currentStep} sx={{ mb: 5 }} alternativeLabel nonLinear>
          {STEPS.map((s, index) => (
            <Step key={s.path} completed={index < currentStep}>
              <StepButton onClick={() => { setValidationError(null); goToStep(index); }}>
                {s.label}
              </StepButton>
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
              <>
                <Button variant="outlined" onClick={() => navigate('/characters')}>
                  Save as Draft
                </Button>
                <Button variant="contained" color="primary" onClick={() => void handleFinish()}>
                  Save & Finish
                </Button>
              </>
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
