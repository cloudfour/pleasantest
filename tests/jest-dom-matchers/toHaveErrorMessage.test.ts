import { withBrowser } from 'pleasantest';

test(
  'toHaveErrorMessage',
  withBrowser(async ({ screen, utils }) => {
    await utils.injectHTML(`
      <label for="startTime"> Please enter a start time for the meeting: </label>
      <input
        id="startTime"
        type="text"
        aria-errormessage="msgID"
        aria-invalid="true"
        value="11:30 PM"
      />
      <span id="msgID" aria-live="assertive" style="visibility:visible">
        Invalid time: the time must be between 9:00 AM and 5:00 PM
      </span>
    `);

    const timeInput = await screen.getByLabelText(/start time/i);

    await expect(timeInput).toHaveErrorMessage(
      'Invalid time: the time must be between 9:00 AM and 5:00 PM',
    );
    await expect(timeInput).not.toHaveErrorMessage(
      'Invalid time', // String performs a full-text match
    );
    await expect(
      expect(timeInput).toHaveErrorMessage(
        'Invalid time', // String performs a full-text match
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "[2mexpect([22m[31melement[39m[2m).toHaveErrorMessage()[22m

      Expected the element to have error message:
      [32m  [32m"Invalid time"[39m[32m[39m
      Received:
      [31m  [31m"Invalid time: the time must be between 9:00 AM and 5:00 PM"[39m[31m[39m"
    `);

    // Case insensitive matching
    await expect(timeInput).toHaveErrorMessage(
      /^invalid time: the time must be between 9:00 am and 5:00 pm$/i,
    );
    // Partial matching
    await expect(timeInput).toHaveErrorMessage(/Invalid time/);
  }),
);
