import {
  getSupabase
} from "../../_lib/supabase.js";

import {
  getSession,
  unauthorized
} from "../../_lib/session.js";

export async function onRequestPost(context) {
  const session =
    await getSession(
      context.request,
      context.env
    );

  if (!session) {
    return unauthorized();
  }

  try {
    const body =
      await context.request.json();

    const reason =
      String(
        body.reason || ""
      ).trim();

    if (!reason) {
      return Response.json(
        {
          success: false,
          error: "Reason is required"
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      getSupabase(context.env);

    // ========================================
    // CREATE NOTICE IN SUPABASE
    // ========================================

    const {
      data,
      error
    } = await supabase
      .from("inactivity_notices")
      .insert({
        user_id:
          session.id,

        username:
          session.username,

        reason,

        status:
          "pending"
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    // ========================================
    // SEND DISCORD EMBED
    // ========================================

    const botToken =
      context.env.DISCORD_BOT_TOKEN;

    const channelId =
      context.env.DISCORD_INACTIVITY_CHANNEL_ID;

    if (
      botToken &&
      channelId
    ) {
      try {
        const discordResponse =
          await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages`,
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bot ${botToken}`,

                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                content:
                  "<@&1538505102644740167> <@&1543383003445723159>",

                allowed_mentions: {
                  roles: [
                    "1538505102644740167",
                    "1543383003445723159"
                  ]
                },

                embeds: [
                  {
                    title:
                      "⏳ Inactivity Notice Request",

                    description:
                      "A Chronoverse staff member has submitted an inactivity notice.",

                    color:
                      11027200,

                    fields: [
                      {
                        name:
                          "Staff Member",

                        value:
                          `${session.username}\n<@${session.id}>`,

                        inline:
                          true
                      },

                      {
                        name:
                          "Status",

                        value:
                          "⏳ Pending Review",

                        inline:
                          true
                      },

                      {
                        name:
                          "Reason",

                        value:
                          reason
                            .slice(
                              0,
                              1024
                            )
                      }
                    ],

                    footer: {
                      text:
                        "Marvel Chronoverse • Inactivity System"
                    },

                    timestamp:
                      new Date()
                        .toISOString()
                  }
                ],

                components: [
                  {
                    type: 1,

                    components: [
                      {
                        type: 2,

                        style: 3,

                        label:
                          "Approve",

                        custom_id:
                          `approve_inactivity:${data.id}`
                      },

                      {
                        type: 2,

                        style: 4,

                        label:
                          "Deny",

                        custom_id:
                          `deny_inactivity:${data.id}`
                      }
                    ]
                  }
                ]
              })
            }
          );

        if (!discordResponse.ok) {
          console.error(
            "Discord inactivity embed failed:",
            discordResponse.status,
            await discordResponse.text()
          );
        }

      } catch (discordError) {
        /*
          IMPORTANT:
          Don't fail the website request if
          Discord happens to be unavailable.
          The notice already exists in Supabase.
        */

        console.error(
          "Discord inactivity error:",
          discordError
        );
      }
    } else {
      console.error(
        "Discord inactivity configuration missing."
      );
    }

    return Response.json(
      {
        success: true,
        notice: data
      },
      {
        status: 201
      }
    );

  } catch (error) {
    console.error(
      "Inactivity submission error:",
      error
    );

    return Response.json(
      {
        success: false,
        error:
          "Unable to submit inactivity notice"
      },
      {
        status: 500
      }
    );
  }
}
