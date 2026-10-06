"""Generates supabase/seed_foods.sql: ~200 common foods, approximate USDA-style values per serving.
Columns: name, serving, kcal, protein g, carbs g, fat g."""

F = """
Chicken breast, cooked|100 g|165|31|0|3.6
Chicken thigh, cooked|100 g|209|26|0|10.9
Ground beef 90% lean, cooked|100 g|217|26|0|11.7
Ground beef 80% lean, cooked|100 g|254|26|0|17
Sirloin steak, cooked|100 g|206|29|0|9
Ribeye steak, cooked|100 g|291|24|0|21
Pork chop, cooked|100 g|231|26|0|13
Pork tenderloin, cooked|100 g|143|26|0|3.5
Bacon|3 slices|161|12|0.4|12
Ham, sliced|56 g|61|10|1.5|1.6
Turkey breast, cooked|100 g|135|30|0|1
Ground turkey 93% lean, cooked|100 g|176|27|0|8
Deli turkey|56 g|60|11|1.5|1
Lamb, cooked|100 g|258|26|0|17
Salmon, cooked|100 g|206|22|0|12
Tuna, canned in water|1 can (142 g)|128|28|0|1.3
Tilapia, cooked|100 g|129|26|0|2.7
Cod, cooked|100 g|105|23|0|0.9
Shrimp, cooked|100 g|99|24|0.2|0.3
Sardines, canned|1 can (92 g)|191|23|0|10.5
Egg, whole|1 large|72|6.3|0.4|4.8
Egg whites|100 g|52|11|0.7|0.2
Tofu, firm|100 g|144|17|2.8|8.7
Tempeh|100 g|192|20|7.6|10.8
Seitan|100 g|120|21|4|2
Edamame, shelled|1 cup|188|18|14|8
Black beans, cooked|1 cup|227|15|41|0.9
Chickpeas, cooked|1 cup|269|14.5|45|4.2
Lentils, cooked|1 cup|230|18|40|0.8
Kidney beans, cooked|1 cup|225|15|40|0.9
Pinto beans, cooked|1 cup|245|15|45|1.1
Refried beans|1/2 cup|118|7|20|1.6
Hummus|2 tbsp|70|2|4|5
Whey protein|1 scoop (30 g)|120|24|3|1.5
Casein protein|1 scoop (33 g)|120|24|3|1
Plant protein powder|1 scoop (33 g)|130|22|5|2.5
Protein bar|1 bar (60 g)|210|20|23|7
Greek yogurt, nonfat plain|170 g|100|17|6|0.7
Greek yogurt, 2% plain|170 g|130|17|7|3.5
Regular yogurt, flavored|170 g|150|6|25|2.5
Cottage cheese, 2%|1/2 cup|90|12|5|2.5
Milk, whole|1 cup|149|8|12|8
Milk, 2%|1 cup|122|8|12|4.8
Milk, skim|1 cup|83|8|12|0.2
Almond milk, unsweetened|1 cup|30|1|1|2.5
Oat milk|1 cup|120|3|16|5
Soy milk|1 cup|105|6|12|3.6
Cheddar cheese|28 g|113|7|0.4|9.3
Mozzarella, part-skim|28 g|72|7|0.8|4.5
Parmesan|1 tbsp grated|22|1.4|0.2|1.4
Feta|28 g|75|4|1.2|6
Cream cheese|1 tbsp|51|0.9|0.8|5
String cheese|1 stick|80|7|1|6
Butter|1 tbsp|102|0.1|0|11.5
Heavy cream|1 tbsp|51|0.4|0.4|5.4
Sour cream|2 tbsp|57|0.7|1.3|5.6
White rice, cooked|1 cup|205|4.3|45|0.4
Brown rice, cooked|1 cup|216|5|45|1.8
Jasmine rice, cooked|1 cup|205|4.2|45|0.4
Quinoa, cooked|1 cup|222|8|39|3.6
Oats, dry|1/2 cup (40 g)|150|5|27|2.5
Pasta, cooked|1 cup|221|8|43|1.3
Whole wheat pasta, cooked|1 cup|174|7.5|37|0.8
Egg noodles, cooked|1 cup|221|7|40|3.3
Ramen noodles, instant|1 pack|380|8|52|14
Couscous, cooked|1 cup|176|6|36|0.3
Bread, white|1 slice|75|2.6|14|1
Bread, whole wheat|1 slice|81|4|14|1.1
Sourdough bread|1 slice|93|3.8|18|0.6
Bagel, plain|1 medium|277|11|55|1.4
English muffin|1 muffin|134|4.4|26|1
Tortilla, flour|1 medium (45 g)|140|3.7|23|3.5
Tortilla, corn|1 small|52|1.4|11|0.7
Pita bread|1 large|165|5.5|33|0.7
Hamburger bun|1 bun|120|4|21|2
Croissant|1 medium|231|4.7|26|12
Pancakes|2 medium|182|5|28|5
Waffle, frozen|2 waffles|190|4|30|6
Granola|1/2 cup|300|7|33|15
Cornflakes|1 cup|100|2|24|0.2
Bran flakes|1 cup|130|4|32|1
Potato, baked|1 medium|161|4.3|37|0.2
Sweet potato, baked|1 medium|103|2.3|24|0.2
French fries|medium serving|365|4|48|17
Mashed potatoes|1 cup|237|4|35|9
Corn, sweet|1 cup|132|5|29|1.8
Popcorn, air-popped|3 cups|93|3|19|1.1
Crackers, saltine|5 crackers|63|1.4|11|1.3
Rice cakes|2 cakes|70|1.4|15|0.6
Pretzels|28 g|108|2.9|23|0.8
Tortilla chips|28 g|140|2|18|7
Potato chips|28 g|152|2|15|10
Apple|1 medium|95|0.5|25|0.3
Banana|1 medium|105|1.3|27|0.4
Orange|1 medium|62|1.2|15|0.2
Grapes|1 cup|104|1.1|27|0.2
Strawberries|1 cup|49|1|12|0.5
Blueberries|1 cup|84|1.1|21|0.5
Raspberries|1 cup|64|1.5|15|0.8
Pineapple|1 cup|82|0.9|22|0.2
Mango|1 cup|99|1.4|25|0.6
Watermelon|1 cup|46|0.9|11.5|0.2
Pear|1 medium|101|0.6|27|0.2
Peach|1 medium|59|1.4|14|0.4
Kiwi|1 fruit|42|0.8|10|0.4
Cherries|1 cup|87|1.5|22|0.3
Avocado|1/2 fruit|160|2|8.5|14.7
Raisins|1/4 cup|108|1.1|29|0.2
Dates, medjool|2 dates|133|0.9|36|0.1
Dried cranberries|1/4 cup|123|0.1|33|0.5
Orange juice|1 cup|112|1.7|26|0.5
Apple juice|1 cup|114|0.2|28|0.3
Broccoli|1 cup|31|2.6|6|0.3
Spinach, raw|1 cup|7|0.9|1.1|0.1
Kale, raw|1 cup|33|2.9|6|0.6
Lettuce, romaine|1 cup|8|0.6|1.5|0.1
Carrots|1 medium|25|0.6|6|0.1
Baby carrots|10 carrots|35|0.6|8|0.1
Cucumber|1 cup sliced|16|0.7|3.8|0.1
Tomato|1 medium|22|1.1|4.8|0.2
Bell pepper|1 medium|24|1|6|0.2
Onion|1 medium|44|1.2|10|0.1
Mushrooms|1 cup|15|2.2|2.3|0.2
Zucchini|1 cup|19|1.4|3.5|0.4
Green beans|1 cup|31|1.8|7|0.2
Asparagus|1 cup|27|3|5|0.2
Brussels sprouts|1 cup|38|3|8|0.3
Cauliflower|1 cup|27|2|5|0.3
Cabbage|1 cup|22|1.1|5|0.1
Peas|1 cup|117|8|21|0.6
Celery|1 stalk|6|0.3|1.2|0.1
Salsa|2 tbsp|10|0.5|2|0
Olive oil|1 tbsp|119|0|0|13.5
Coconut oil|1 tbsp|121|0|0|13.5
Vegetable oil|1 tbsp|124|0|0|14
Mayonnaise|1 tbsp|94|0.1|0.1|10.3
Ranch dressing|2 tbsp|129|0.4|1.8|13.4
Italian dressing|2 tbsp|71|0.1|3|6.4
Ketchup|1 tbsp|20|0.2|5|0
Mustard|1 tsp|3|0.2|0.3|0.2
BBQ sauce|2 tbsp|58|0.3|14|0.2
Soy sauce|1 tbsp|9|1.3|0.8|0.1
Hot sauce|1 tsp|1|0|0.1|0
Honey|1 tbsp|64|0.1|17|0
Maple syrup|1 tbsp|52|0|13|0
Sugar|1 tsp|16|0|4.2|0
Jam|1 tbsp|56|0.1|14|0
Peanut butter|2 tbsp|188|8|6|16
Almond butter|2 tbsp|196|6.7|6|17.8
Nutella|2 tbsp|200|2|22|11
Almonds|28 g|164|6|6|14
Peanuts|28 g|161|7.3|4.6|14
Cashews|28 g|157|5|8.6|12.4
Walnuts|28 g|185|4.3|3.9|18.5
Pistachios|28 g|159|5.7|7.7|12.8
Sunflower seeds|28 g|165|5.5|7|14
Chia seeds|1 tbsp|58|2|5|3.7
Flax seeds, ground|1 tbsp|37|1.3|2|3
Trail mix|1/4 cup|173|5|17|11
Dark chocolate 70%|28 g|170|2.2|13|12
Milk chocolate|28 g|150|2.1|17|8.5
Ice cream, vanilla|1/2 cup|137|2.3|16|7.3
Frozen yogurt|1/2 cup|111|3|19|3
Cookie, chocolate chip|1 medium|78|0.9|10|3.7
Brownie|1 square|227|2.7|36|9
Donut, glazed|1 medium|269|3|31|15
Muffin, blueberry|1 medium|377|5.5|53|16
Cheese pizza|1 slice|285|12|36|10
Pepperoni pizza|1 slice|313|13|36|13
Cheeseburger|1 burger|303|15|33|12
Hot dog with bun|1|314|11|24|19
Chicken nuggets|6 pieces|280|14|17|17
Burrito, bean and cheese|1 burrito|380|14|55|11
Chicken burrito bowl|1 bowl|630|42|70|20
Sushi roll, California|8 pieces|255|9|38|7
Fried rice|1 cup|238|5.5|45|4
Pad thai|1 cup|357|14|46|14
Chicken caesar salad|1 bowl|440|35|15|27
Grilled cheese sandwich|1|366|14|29|21
Turkey sandwich|1|330|24|34|10
Peanut butter and jelly sandwich|1|376|13|50|15
Mac and cheese|1 cup|376|15|44|16
Spaghetti with meat sauce|1 cup|330|17|40|11
Chili with beans|1 cup|256|20|22|10
Chicken noodle soup|1 cup|62|3.2|7.3|2.4
Tomato soup|1 cup|85|2|17|1
Oatmeal, instant flavored|1 packet|160|4|32|2
Smoothie, fruit|16 oz|270|4|60|1
Coffee, black|1 cup|2|0.3|0|0
Latte, whole milk|16 oz|190|10|15|10
Cola|12 oz can|140|0|39|0
Sports drink|20 oz|140|0|34|0
Energy drink|8 oz|110|0|28|0
Beer, regular|12 oz|153|1.6|13|0
Wine, red|5 oz|125|0.1|3.8|0
Rice pudding|1/2 cup|150|4|25|3.5
Beef jerky|28 g|116|9.4|3.1|7.3
Protein shake, ready-to-drink|11 oz|160|30|5|3
Overnight oats with milk|1 jar|330|14|52|8
Chicken wings|6 wings|430|36|0|30
Rotisserie chicken, skin on|100 g|239|27|0|14
"""

rows = [l.split("|") for l in F.strip().splitlines()]
assert len(rows) >= 200, len(rows)
assert len({r[0] for r in rows}) == len(rows), "duplicate food"
q = lambda s: "'" + s.replace("'", "''") + "'"
vals = ",\n".join(f"  ({q(n)}, {q(s)}, {k}, {p}, {c}, {f})" for n, s, k, p, c, f in rows)
open("supabase/seed_foods.sql", "w").write(
    "-- Generated by scripts/foods.py. Approximate values per serving.\n"
    "insert into public.foods (name, serving_size, calories, protein_g, carbs_g, fat_g) values\n" + vals + "\non conflict (name) where created_by is null do nothing;\n")
print("ok", len(rows), "foods")
