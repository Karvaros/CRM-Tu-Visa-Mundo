import StudyWizard from "./StudyWizard";

export const dynamic = "force-dynamic";

export default function StudyPage() {
  const enabled = process.env.STUDY_SUBMISSION_ENABLED === "true"
    && Boolean(process.env.BASEROW_TOKEN && process.env.ACTIVE_CAMPAIGN_API_URL && process.env.ACTIVE_CAMPAIGN_API_KEY);
  return <StudyWizard enabled={enabled} />;
}
