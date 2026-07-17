# Download all 23 items
mkdir -p /opt/data/BocaBurger/pokegatchi/art/source/003-items

cd /opt/data/BocaBurger/pokegatchi/art/source/003-items

# Food & Berries (B1-B8)
curl -sLo item_berry_blue_32.png "https://v3b.fal.media/files/b/0aa254be/vCP7l5eOtPx9wK8rPvV1v_0ovNvICt.png"
curl -sLo item_berry_red_32.png "https://v3b.fal.media/files/b/0aa254be/e_5xSRYM3r1fkaADtmMX1_sh6IkQs4.png"
curl -sLo item_berry_gold_32.png "https://v3b.fal.media/files/b/0aa254be/mH4lxsmnELwRXsn2jpnDe_UALLXCtg.png"
curl -sLo item_berry_purple_32.png "https://v3b.fal.media/files/b/0aa254c2/5e75Rez0zKVS3TuJpSqIT_r9KvBwq6.png"
curl -sLo item_food_bowl_32.png "https://v3b.fal.media/files/b/0aa254c3/FQyF2a_OHkPZGnBAdY6k5_W1i95QUp.png"
curl -sLo item_treat_biscuit_32.png "https://v3b.fal.media/files/b/0aa254c3/ptA-EX1XjDOa9--iSE1Iz_JvRn7mxC.png"
curl -sLo item_candy_basic_24.png "https://v3b.fal.media/files/b/0aa254c4/q5xjJARU2P21vbmRL9mP4_xFxemYBZ.png"
curl -sLo item_candy_rare_24.png "https://v3b.fal.media/files/b/0aa254c4/OO_VgnCRm8l8ZKhO6IO2m_dMOeQx25.png"

# Toys (B9-B12)
curl -sLo item_toy_ball_32.png "https://v3b.fal.media/files/b/0aa254c5/l-Q83UpSyr3L5lUhistM9_X9KQWHmy.png"
curl -sLo item_toy_plush_32.png "https://v3b.fal.media/files/b/0aa254d2/wjuqGYxfQ0Iy3FiLtr97d_mHMZRcey.png"
curl -sLo item_toy_ribbon_32.png "https://v3b.fal.media/files/b/0aa254c6/ft_-lpd_BupiLrkeiyvp4_rysnThjR.png"
curl -sLo item_toy_block_32.png "https://v3b.fal.media/files/b/0aa254c6/HhWVgTFcd52HjfKJa_ACq_EOFQkKNt.png"

# Care (B13-B16)
curl -sLo item_bath_soap_32.png "https://v3b.fal.media/files/b/0aa254d4/54hspNsdNK2dsdHQKSz-t_DMUYzKNw.png"
curl -sLo item_bath_brush_32.png "https://v3b.fal.media/files/b/0aa254c8/HdUyT6RIWG6ZhW6yDrVSd_CLdRd4Io.png"
curl -sLo item_heal_potion_32.png "https://v3b.fal.media/files/b/0aa254d5/gRuCqf0g7Z_oNErvWawgk_jGAXkKZF.png"
curl -sLo item_heal_bandage_24.png "https://v3b.fal.media/files/b/0aa254d6/S3Y0XYtTqExDtUumBUopw_kWPgrnXQ.png"

# Bonus (B17-B20)
curl -sLo item_bonus_starpiece_32.png "https://v3b.fal.media/files/b/0aa254ca/8I5MCqrY39a4_qlb7T2yP_DUogX5cE.png"
curl -sLo item_bonus_luckyegg_32.png "https://v3b.fal.media/files/b/0aa254ca/W_nOPDoIvJwXcKrkt1pAe_vl9Sfhw0.png"
curl -sLo item_bonus_incense_32.png "https://v3b.fal.media/files/b/0aa254cc/L79FsVHqQMkXbQCJkGeiB_wyfUOZie.png"
curl -sLo item_bonus_giftbox_32.png "https://v3b.fal.media/files/b/0aa254cc/QQHmSGitqOZ5mypMbvhrL_whvUhnrA.png"

# Badges (B21-B23)
curl -sLo item_badge_silver_24.png "https://v3b.fal.media/files/b/0aa254cc/ikmuDUlB5e-iiay8ACyAM_SSK6xea0.png"
curl -sLo item_badge_gold_24.png "https://v3b.fal.media/files/b/0aa254ce/dpaEDziSYiBhMQ5-yVKlC_f23vSykW.png"
curl -sLo item_key_stone_32.png "https://v3b.fal.media/files/b/0aa254da/SKRxePV9i0sop4FfsWiSQ_1bCGguqw.png"

echo "Downloaded $(ls -1 | wc -l) / 23 items"