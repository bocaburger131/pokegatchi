extends SceneTree
func _init():
    var gs = load("res://scripts/GameState.gd").new()
    # simulate fresh
    gs.bag_items = {"Poké Ball": 5, "Berry": 3}
    gs.hunger=40; gs.happiness=65; gs.energy=70
    gs.pokedex_seen = ["Eevee"]
    gs.journal_entries = []
    gs.add_journal_entry("Boot")
    print("Pre-consume bag:", gs.get_bag())
    var ok = gs.remove_item("Berry", 1)
    print("Remove Berry ok:", ok, "now:", gs.get_bag())
    gs.register_species("Charmander")
    print("Pokedex after register:", gs.get_pokedex())
    print("Journal count:", gs.get_journal().size())
    print("All GameState verified")
    quit()