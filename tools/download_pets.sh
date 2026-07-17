mkdir -p /opt/data/BocaBurger/pokegatchi/art/source/004-pets
cd /opt/data/BocaBurger/pokegatchi/art/source/004-pets

# Pikachu (8)
curl -sLo pet_pikachu_idle_128.png "https://v3b.fal.media/files/b/0aa25517/anzngfZSVjIPp98Hetewv_5sgs76kI.png"
curl -sLo pet_pikachu_happy_128.png "https://v3b.fal.media/files/b/0aa25517/akdxy5t467yHhXR3Y9n2d_cgA1KA61.png"
curl -sLo pet_pikachu_sad_128.png "https://v3b.fal.media/files/b/0aa25517/HHzDNfOV2bKJWd5gAZdWb_nuSAyv3c.png"
curl -sLo pet_pikachu_hungry_128.png "https://v3b.fal.media/files/b/0aa25519/P2vx-xCQwSVmH8as5cs2g_exianTcY.png"
curl -sLo pet_pikachu_dirty_128.png "https://v3b.fal.media/files/b/0aa25519/ODhrhn4QHWFqXt7tKlSUo_rUIHbZ6W.png"
curl -sLo pet_pikachu_bored_128.png "https://v3b.fal.media/files/b/0aa2551b/81lfFUSOLxn_ogmt2eJ8q_WZnC6gHC.png"
curl -sLo pet_pikachu_sleeping_128.png "https://v3b.fal.media/files/b/0aa25519/MKX5uNWsnB8E4y7cqmgMm_wlSRjU0Z.png"

# Eevee (7)
curl -sLo pet_eevee_idle_128.png "https://v3b.fal.media/files/b/0aa2551b/6xSEe5dDpU0z1iNYMC0yl_Z9aAu8oW.png"
curl -sLo pet_eevee_happy_128.png "https://v3b.fal.media/files/b/0aa2551b/wtoy1PExickGj2FaKCize_apXRxeFn.png"
curl -sLo pet_eevee_sad_128.png "https://v3b.fal.media/files/b/0aa2551c/atNFDWpZQVDSvYkDTOkjM_g39K6OGi.png"
curl -sLo pet_eevee_hungry_128.png "https://v3b.fal.media/files/b/0aa2551c/zffVL2J6lOjUHy1sp4mSI_ILfMhDwn.png"
curl -sLo pet_eevee_dirty_128.png "https://v3b.fal.media/files/b/0aa2551e/3U0mG_Rg-1WTAAcvJLfWo_ORIHBy2O.png"
curl -sLo pet_eevee_bored_128.png "https://v3b.fal.media/files/b/0aa2551f/3yRXMOCxLhNm--v-wdpth_nHryPfGp.png"
curl -sLo pet_eevee_sleeping_128.png "https://v3b.fal.media/files/b/0aa2551d/frVYtodJgajRzUYqA2Mi-_NzvlmAQ8.png"

# Squirtle (7)
curl -sLo pet_squirtle_idle_128.png "https://v3b.fal.media/files/b/0aa2552b/zaw54tXEN_zvgdu5QGIzH_vQSaGTDe.png"
curl -sLo pet_squirtle_happy_128.png "https://v3b.fal.media/files/b/0aa25521/k2Z3JwOJ21VlIeS1rDxLY_GXXQ8Awi.png"
curl -sLo pet_squirtle_sad_128.png "https://v3b.fal.media/files/b/0aa25521/JxrgPvgILuz9JxTvbFOKf_4DeGwAzy.png"
curl -sLo pet_squirtle_hungry_128.png "https://v3b.fal.media/files/b/0aa2552f/P1Fyzo-4N3C9hpntoKEz8_TsNZ9EZu.png"
curl -sLo pet_squirtle_dirty_128.png "https://v3b.fal.media/files/b/0aa25523/X9i8691H3REoRCqEL_pbn_ayDrpUiN.png"
curl -sLo pet_squirtle_bored_128.png "https://v3b.fal.media/files/b/0aa2552f/mt2-s1_N2kfIu0HqJ-adR_2mWOvhAU.png"
curl -sLo pet_squirtle_sleeping_128.png "https://v3b.fal.media/files/b/0aa2552d/pY1XX1OQPM7LxaNPnpxWf_Ca5M9GHJ.png"

# Egg
curl -sLo pet_generic_egg_128.png "https://v3b.fal.media/files/b/0aa25524/pRNG1bRvdbfUwZJD-H02k_KwasLHoK.png"

echo "Downloaded $(ls -1 | wc -l) / 22 pets"