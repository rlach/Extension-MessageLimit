# Message Limit

Limit the maximum number of visible chat messages to be sent per prompt. Does not include example messages, in-chat injections, etc.

## How to use

1. Install the extension via the URL: `https://github.com/SillyTavern/Extension-MessageLimit`
2. Enable the extension in the extension settings menu. Set the message limit to your desired value (default: 10).
3. If you need to apply the message limit to background/quiet prompts (e.g. extensions, slash commands, etc.), enable the "Apply to background prompts" setting.
4. Optionally, adjust the "Messages to advance by" setting to control how many messages are removed at a time when trimming. Higher values keep the oldest messages constant longer, which helps with context caching (default: 1).

## Inline Media Limit

Independently of the message count limit, you can restrict how many messages are allowed to carry inline media (images, video, audio) in the prompt sent to the LLM.

### How it works

1. Enable **"Limit number of messages with inline media"** and set the desired limit (minimum 1).
2. The filter iterates from the **newest** message to the **oldest**, counting only messages that actually contain inline media. Messages without media are skipped entirely and do not count toward the limit.
3. Once the number of media-carrying messages exceeds the limit, inline media is **stripped** from every older message. The messages themselves are **not** removed — only their media attachments are pruned.

### Interaction with other settings

- This setting works **regardless** of whether the main message limit is enabled.
- If other limits (message count, background prompts filter) are also active, they are applied **first**. The inline media limit runs **after** all other filters, operating on whatever messages remain.

### Example

With a limit of **2** and the following chat (newest first):

| Message | Inline media |
|---------|-------------|
| #5 | 5 images |
| #4 | 0 |
| #3 | 0 |
| #2 | 10 images |
| #1 | 3 images |

Messages #5 and #2 are the two newest messages with media, so all 15 of their images are kept. Message #1 has its 3 images stripped. Messages #4 and #3 have no media and are unaffected.

## Slash Commands

### `/ml-state`

Enable or disable the message limit. Just returns the current state if no arguments are provided.

```stscript
/ml-state toggle
```

```stscript
/ml-state | /echo
```

### `/ml-limit`

Set the message limit. Just returns the current limit if no arguments are provided.

```stscript
/ml-limit 5
```

```stscript
/ml-limit | /echo
```

### `/ml-advance`

Set the number of messages to advance by when trimming chat. Just returns the current advance count if no arguments are provided.

```stscript
/ml-advance 5
```

```stscript
/ml-advance | /echo
```

### `/ml-quiet`

Enable or disable the message limit for background (quiet) prompts. Just returns the current state if no arguments are provided.

```stscript
// Summarize only the last 5 messages ||
/ml-state on | /ml-limit 5 | /ml-quiet on | /summarize | /ml-state off
```

### `/ml-media-state`

Enable or disable the inline media limit. Just returns the current state if no arguments are provided.

```stscript
/ml-media-state toggle
```

```stscript
/ml-media-state | /echo
```

### `/ml-media-limit`

Set the maximum number of messages with inline media to keep. Just returns the current limit if no arguments are provided.

```stscript
/ml-media-limit 3
```

```stscript
/ml-media-limit | /echo
```

## License

AGPL-3.0

