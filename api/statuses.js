export default function handler(req, res) {
  const STATUSES = ["Applied", "Phone Screen", "Interviewing", "Offer", "Rejected"];
  res.status(200).json(STATUSES);
}
