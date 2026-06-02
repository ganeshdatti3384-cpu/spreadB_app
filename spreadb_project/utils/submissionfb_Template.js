export const feedbackEmailTemplate = ({
  firstName,        // from InfluencerProfile.firstName
  campaignTitle,
  rating,
}) => {
  return `
    <div style="font-family: Arial, sans-serif;">
      <h2>🎉 Feedback Received</h2>

      <p>Hi there,</p>

      <p>
        The brand has reviewed your work for the campaign:
        <b>${campaignTitle}</b>
      </p>

      <p>
        ⭐ Rating: <b>${rating}/5</b>
      </p>

      <p>
        Please log in to <b>SpreadB</b> to view more details.
      </p>

      <br/>
      <p>– SpreadB Team</p>
    </div>
  `;
};
