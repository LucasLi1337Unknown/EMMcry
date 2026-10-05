import collections
import importlib.util
import os
import pathlib
import random
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import emmc

def compile_source(source, directory, name='program', dialect='emm'):
    path = directory / (name + '.' + dialect)
    path.write_text(source, encoding='utf-8')
    binary = directory / name
    result = subprocess.run([sys.executable, str(ROOT/'emmc.py'), str(path), '-o', str(binary)], capture_output=True, text=True)
    if result.returncode: raise AssertionError(result.stderr)
    return binary

def reference(hand):
    ranks = sorted((rank for rank, suit in hand), reverse=True)
    counts = collections.Counter(ranks)
    groups = sorted(counts, key=lambda rank: (counts[rank], rank), reverse=True)
    sizes = sorted(counts.values(), reverse=True)
    flush = len({s for r,s in hand}) == 1
    unique = sorted(counts)
    straight = 0
    if unique == [2,3,4,5,14]: straight = 5
    elif len(unique)==5 and unique[-1]-unique[0]==4: straight = unique[-1]
    if flush and straight: return [8,straight]
    if sizes[0]==4: return [7]+groups
    if sizes==[3,2]: return [6]+groups
    if flush: return [5]+ranks
    if straight: return [4,straight]
    if sizes[0]==3: return [3]+groups
    if sizes[:2]==[2,2]: return [2]+groups
    if sizes[0]==2: return [1]+groups
    return [0]+ranks

class Frontend(unittest.TestCase):
    def test_canonical_tokens(self):
        ts=emmc.lex('... ...? ...! ?? ??? ???? ...... ..... ??... !... ...?? !! !? !!! ++ -- ..','a.emm','emm')
        self.assertEqual([t.kind for t in ts[:-1]], ['var','input','print','if','elif','else','while','for','fn','return','call','break','continue','exit','true','false','null'])
    def test_graphemes(self):
        ts=emmc.lex('🍼🧑🏽‍💻 🟰 13 😭 🧑🏽‍💻 🍼🇨🇳 🟰 2 🍼1️⃣ = 1','a.cry','cry')
        self.assertEqual([t.value for t in ts if t.kind=='id'],['🧑🏽‍💻','🧑🏽‍💻','🇨🇳','1️⃣'])
    def test_selectors(self):
        ir=emmc.parse('🍼👦 = 13 🤔 👦 ▶🟰 13 🫴 😭 "ok" 🫷','a.cry','cry')
        self.assertEqual(ir[1]['tag'],'if')
    def test_order_is_not_equivalent(self):
        with self.assertRaises(emmc.Error): emmc.parse('?... x','a.emm','emm')
    def test_illegal_control(self):
        for source in ['!!','!?','!... 1','...... ++ { ??... f() { !! } }']:
            with self.subTest(source=source), self.assertRaises(emmc.Error): emmc.parse(source,'a.emm','emm')
    def test_diagnostics(self):
        with self.assertRaises(emmc.Error) as error: emmc.parse('... x =\n )','source.emm','emm')
        self.assertIn('source.emm:2:2',str(error.exception))
    def test_roundtrip_ir(self):
        source=(ROOT/'tests/native_core.emm').read_text()
        cry=emmc.translate(source,'core.emm','cry')
        back=emmc.translate(cry,'core.cry','emm')
        def strip(value):
            if isinstance(value,dict): return {k:strip(v) for k,v in value.items() if k!='loc'}
            if isinstance(value,(list,tuple)): return [strip(x) for x in value]
            return value
        self.assertEqual(strip(emmc.parse(source,'a.emm','emm')),strip(emmc.parse(back,'a.emm','emm')))
        self.assertIn('"你好😭"',cry)
    def test_emoji_name_roundtrip(self):
        source='🍼🧑🏽‍💻 = 1 😭 🧑🏽‍💻'
        translated=emmc.translate(source,'a.cry','emm')
        self.assertEqual(emmc.parse(translated,'a.emm','emm')[0]['name'],'🧑🏽‍💻')
        emmc.parse(emmc.translate('🍼 a = 📦[1,2]','a.cry','emm'),'a.emm','emm')
    def test_translation_collision(self):
        with self.assertRaises(emmc.Error): emmc.translate('... 😭 = 1','a.emm','cry')
    def test_nonfinite_literal(self):
        with self.assertRaises(emmc.Error): emmc.parse('... x = 1e999','a.emm','emm')
        with self.assertRaises(emmc.Error): emmc.parse('... x = "\\ud800"','a.emm','emm')

class Native(unittest.TestCase):
    def test_both_dialects(self):
        source=(ROOT/'tests/native_core.emm').read_text()
        with tempfile.TemporaryDirectory() as tmp:
            directory=pathlib.Path(tmp)
            for dialect in ['emm','cry']:
                with self.subTest(dialect=dialect):
                    text=source if dialect=='emm' else emmc.translate(source,'core.emm','cry')
                    binary=compile_source(text,directory,dialect,dialect)
                    p=subprocess.run([str(binary),'argument'],cwd=directory,env={**os.environ,'EMM_TEST':'works'},capture_output=True,text=True,timeout=10)
                    self.assertEqual(p.returncode,0,p.stderr);self.assertEqual(p.stdout,'CORE PASS\n')
    def test_poker_reference(self):
        # Fixtures force all categories and both Ace-low straights. Random hands
        # independently test full kicker ordering across 1,000 valid deals.
        fixtures=[[(r,s) for r,s in zip(rs,ss)] for rs,ss in [
            ([14,11,9,6,2],'SHDCS'),([14,14,9,6,2],'SHDCS'),
            ([14,14,9,9,2],'SHDCS'),([14,14,14,6,2],'SHDCS'),
            ([2,3,4,5,14],'SHDCS'),([14,11,9,6,2],'SSSSS'),
            ([14,14,14,6,6],'SHDCS'),([14,14,14,14,2],'SHDCS'),
            ([10,11,12,13,14],'SSSSS'),([2,3,4,5,14],'HHHHH')]]
        rng=random.Random(1337);deck=[(r,s) for r in range(2,15) for s in 'SHDC']
        hands=fixtures+[rng.sample(deck,5) for _ in range(1000)]
        data=str(len(hands))+'\n'+'\n'.join(','.join(f'{r}:{s}' for r,s in h) for h in hands)+'\n'
        with tempfile.TemporaryDirectory() as tmp:
            d=pathlib.Path(tmp)
            (d/'pokerlib.emm').write_text((ROOT/'examples/pokerlib.emm').read_text())
            src=(ROOT/'examples/poker_check.emm').read_text()
            for dialect in ['emm','cry']:
                with self.subTest(dialect=dialect):
                    text=src if dialect=='emm' else emmc.translate(src,'check.emm','cry')
                    binary=compile_source(text,d,'poker-'+dialect,dialect)
                    p=subprocess.run([str(binary)],input=data,capture_output=True,text=True,timeout=20)
                    self.assertEqual(p.returncode,0,p.stderr)
                    scores=[list(map(int,line.split(','))) for line in p.stdout.splitlines()]
                    self.assertEqual(scores,[reference(h) for h in hands])
    def test_modules_unicode_and_errors(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=pathlib.Path(tmp)
            (d/'helper.cry').write_text('🧩 add(a,b) 🫴 ↩️ a ➕ b 🫷 🧩 isolated() 🫴 🛟 🫴 ↩️ secret 🫷 🪤 error 🫴 ↩️ "isolated" 🫷 🫷')
            source='... secret = "leaked" << "helper.cry" : helper ...! ...?? helper.add(2,3) ...! ...?? helper.isolated() ...! 1 / 0'
            binary=compile_source(source,d)
            p=subprocess.run([str(binary)],capture_output=True,text=True)
            self.assertEqual(p.stdout,'5\nisolated\n');self.assertEqual(p.returncode,1)
            self.assertIn('EMM1001',p.stderr);self.assertIn('Division by zero',p.stderr)
            binary=compile_source('🍼🧑🏽‍💻 = 9 😭 🧑🏽‍💻',d,'unicode','cry')
            self.assertEqual(subprocess.check_output([str(binary)],text=True),'9\n')
    def test_import_cycles(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=pathlib.Path(tmp)
            (d/'a.emm').write_text('<< "b.emm" : b')
            (d/'b.emm').write_text('<< "a.emm" : a')
            p=subprocess.run([sys.executable,str(ROOT/'emmc.py'),str(d/'a.emm')],capture_output=True,text=True)
            self.assertNotEqual(p.returncode,0);self.assertIn('Cyclic imports',p.stderr)
    def test_exit_and_input(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=pathlib.Path(tmp)
            binary=compile_source('... text = "" ...? text ...! "hi " + text !!! 7',d)
            p=subprocess.run([str(binary)],input='Lucas\n',capture_output=True,text=True)
            self.assertEqual(p.stdout,'hi Lucas\n');self.assertEqual(p.returncode,7)

if __name__=='__main__': unittest.main()
