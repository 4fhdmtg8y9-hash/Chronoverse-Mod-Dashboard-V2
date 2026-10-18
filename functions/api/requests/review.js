```js
import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

const REVIEW_ROLES = [
  "1542018762285252690", // Community Manager
  "1561102957007601856"  // Director
];

async function canReview(
  session,
  env
) {
  if (
    !env.DISCORD_GUILD_ID ||
    !env.DISCORD_BOT_TOKEN
  ) {
    return false;
  }

  const response =
    await fetch(
      `https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${session.id}`,
      {
        headers: {
          Authorization:
            `Bot ${env.DISCORD_BOT_TOKEN}`
        }
      }
    );

  if (!response.ok) {
    return false;
  }

  const member =
    await response.json();

  return (
    member.roles || []
  ).some(role =>
    REVIEW_ROLES.includes(role)
  );
}

export async function onRequestPost(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  const permitted =
    await canReview(
      session,
      context.env
    );

  if (!permitted) {
    return Response.json(
      {
        success: false,
        error:
          "Only the Community Manager or Director can review requests."
      },
      {
        status: 403
      }
    );
  }

  try {
    const body =
      await context.request.json();

    const requestId =
      body.request_id;

    const status =
      String(
        body.status || ""
      ).trim();

    if (
      !requestId ||
      ![
        "approved",
        "denied"
      ].includes(status)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Invalid request review"
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabase(context.env);

    const {
      data,
      error
    } = await supabase
      .from("requests")
      .update({
        status,

        reviewed_by:
          session.id,

        reviewed_at:
          new Date()
            .toISOString()
      })
      .eq("id", requestId)
      .eq(
        "status",
        "pending"
      )
      .select("*")
      .single();

    if (error || !data) {
      return Response.json(
        {
          success: false,
          error:
            "Request could not be reviewed"
        },
        {
          status: 400
        }
      );
    }

    return Response.json({
      success: true,
      request: data
    });

  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error:
          "Unable to review request"
      },
      {
        status: 500
      }
    );
  }
}
```
