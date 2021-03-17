$(function() {
	const ACTIVE_CLASS = 'is-active';

	/**
	 * 楽天レシピAPIのデータ周り
	 *
	 */
	class RakutenRecepiAPI {
		constructor (options) {
			this.data = JSON.parse(localStorage.getItem('week-dinner')) || {};
			// カテゴリID一覧
			this.categoryIdList = [31, 32, 33, 14, 15, 16, 17, 23, 10, 11, 38, 39, 41, 42, 43, 44, 25, 46];

			this.$image = $('.' + options.imageClassName);
			this.$time = $('.' + options.timeClassName);
			this.$price = $('.' + options.priceClassName);
			this.$title = $('.' + options.titleClassName);
		}
		/**
		 * 初期表示
		 *
		 * @return {void} JSONをdataに保存
		*/
		init () {
			this.updateLecipeAtLoading();
		}
		/**
		 * ページ読み込み時、レシピを一斉更新
		 *
		 * @return {Promise} JSONをdataに保存
		*/
		updateLecipeAtLoading () {
			return new Promise((resolve, reject) => {
				// カテゴリIDをセットしてJSON取得
				$.getJSON(this.setURL({isSetId: true}), (result) => {
					// 短時間に複数回通信するとエラーとなるので少し時間を空ける
					setTimeout(() => {
						$.getJSON(this.setURL({isSetId: true}), (result2) => {
							const getData = this.integratedAcquiredData({
								sourceData: result.result,
								integrateData: result2.result,
							});

							this.setLocalStorageAtLoading(getData);
							this.updateCassetteContents();
						});
					}, 1000);
				}).catch(() => {
					if (confirm('読み込みに失敗しました。再試行しますか？')) {
						// 短時間に複数回通信するとエラーとなるので少し時間を空ける
						setTimeout(() => {
							this.updateLecipeAtLoading();
						}, 1000);
					}
				});
			});
		}
		/**
		 * ページ読み込み時、ローカルストレージにデータをセット
		 *
		 * @return {Promise} JSONをdataに保存
		*/
		setLocalStorageAtLoading (datas) {
			const newDate = new Date();
			// 1日前の日付に変更（あとで1日ずつ足していくため）
			newDate.setDate(newDate.getDate() - 1);
			newDate.setHours(0);
			newDate.setMinutes(0);

			// dataの中身がある時の処理（初回以外）
			if (this.data[0] !== undefined) {
				const CALC_DATE = 1000 * 60 * 60 * 24;
				// ローカルストレージにセットされている1日目のデータから日付を生成
				const firstDateData = this.data[0]['date'];
				const originalDate = new Date(firstDateData['year'], firstDateData['month'], firstDateData['date']);
				// セットされていた日付と今日の差分を求める
				const dateDifference = Math.floor((newDate - originalDate) / CALC_DATE);

				// 日付に差があったらデータをセットし直す
				if (dateDifference > 0) {
					for (let i = 0; i < datas.length; i++) {
						// セットする日付に更新
						newDate.setDate(newDate.getDate() + 1);

						if (i + dateDifference < 6) {
							// 差分が6未満なら、データを移行
							this.data[i] = this.data[i + dateDifference + 1];
						} else {
							// 差分が6以上なら、新しくデータをセット
							this.data[i] = {
								recipe: datas[i],
								date: {
									year: newDate.getFullYear(),
									month: newDate.getMonth(),
									date: newDate.getDate(),
								}
							}
						}
					}
				}
			// dataの中身がセットされていない時の処理（初回）
			} else {
				// すべてのデータを上書き
				for (let i = 0; i < datas.length; i++) {
					// セットする日付に更新
					newDate.setDate(newDate.getDate() + 1);

					// 新しくデータをセット
					this.data[i] = {
						recipe: datas[i],
						date: {
							year: newDate.getFullYear(),
							month: newDate.getMonth(),
							date: newDate.getDate(),
						}
					}
				}
			}
			// ローカルストレージにセット
			localStorage.setItem('week-dinner', JSON.stringify(this.data));
		}
		/**
		 * 1回目に取得したデータに、2回目に取得したデータを統合する
		 *
		 * @param {object} sourceData 1回目に取得したデータ
		 * @param {object} integrateData 2回目に取得したデータ
		 * @return {object} レシピ一覧
		*/
		integratedAcquiredData ({sourceData, integrateData}) {
			sourceData[4] = integrateData[0];
			sourceData[5] = integrateData[1];
			sourceData[6] = integrateData[2];
			return sourceData;
		}
		/**
		 * ランダムのレシピに更新
		 *
		 * @return {Promise} JSONをdataに保存
		*/
		updateRandomLecipe ({dateNumber}) {
			return new Promise(() => {
				// カテゴリIDをセットしてJSON取得
				$.getJSON(this.setURL({isSetId: true}), (result) => {
					// 日にち区分を指定してローカルストレージに保存
					this.updateLocalStorageSpecifiedDate({
						data: result.result[this.setRandomNum(4)],
						dateNumber,
					});
					this.updateCassetteContents();
				}).catch(() => {
					if (confirm('読み込みに失敗しました。再試行しますか？')) {
						this.updateRandomLecipe();
					}
				});
			});
		}
		/**
		 * 日にち区分を指定してローカルストレージに保存
		 *
		 * @return {void}
		*/
		updateLocalStorageSpecifiedDate ({data, dateNumber}) {
			this.data[dateNumber]['recipe'] = data;
			localStorage.setItem('week-dinner', JSON.stringify(this.data));
		}
		/**
		 * URLを生成
		 *
		 * @param {boolean} isSetId カテゴリIDをセットするか
		 * @return {string} URL
		*/
		setURL ({isSetId}) {
			let url = 'https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426?';
			// カテゴリIDが必要だったらセット
			const params = {
				format: 'json',
				categoryId: isSetId ? this.setRandomCategoryId() : null,
				applicationId: '1099641121016352250',
			}

			// URL生成
			for (const param in params) {
				const str = !(param === null) ? `${param}=${params[param]}&` : '';
				url += str;
			}
			return url;
		}
		/**
		 * ランダムのカテゴリIDを返却
		 *
		 * @return {Number} カテゴリID
		*/
		setRandomCategoryId () {
			return this.categoryIdList[this.setRandomNum(this.categoryIdList.length)];
		}
		/**
		 * 最大値のうちランダムな整数を返す
		 *
		 * @param {Number} maxNumber 最大値
		 * @return {Number} ランダム数字
		*/
		setRandomNum (maxNumber) {
			return Math.floor(Math.random() * maxNumber);
		}
		/**
		 * カセットのデータを更新
		 *
		 * @return {void}
		*/
		updateCassetteContents () {
			for (let i = 0; i < 7; i++) {
				const recipeData = this.data[i].recipe;
				const $target = $(`.js-recipe[data-date-num="${i}"]`);

				// 画像
				$target.find('.js-recipe_image').attr('style', `background-image:url(${recipeData.foodImageUrl});`);
				// 時間
				$target.find('.js-recipe_time').text(recipeData.recipeIndication);
				// 金額
				$target.find('.js-recipe_price').text(recipeData.recipeCost);
				// タイトル
				$target.find('.js-recipe_title').text(recipeData.recipeTitle);
			}
		}
		/**
		 * モーダルのデータを更新
		 *
		 * @param {object} $currentTarget $(e.target)
		 * @param {void} recipeClassName 'js-recipe'
		 * @return {void}
		*/
		updateModalContents ({$currentTarget, recipeClassName}) {
			// 日にち区分の数字を取得
			const num = $currentTarget.closest('.' + recipeClassName).data('date-num');

			const recipeData = this.data[num].recipe;
			const $target = $('.js-modal_recipe');
			const division = ['今日', '明日', '明後日', '3日後', '4日後', '5日後', '6日後'];

			// 日にち区分
			$('.js-modal_sub_title').text(`${division[num]}のレシピ`);
			// 画像
			$target.find('.js-modal_image').attr('src', recipeData.foodImageUrl).attr('alt', recipeData.recipeTitle);
			// 時間
			$target.find('.js-modal_time').text(recipeData.recipeIndication);
			// 金額
			$target.find('.js-modal_price').text(recipeData.recipeCost);
			// タイトル
			$target.find('.js-modal_title').text(recipeData.recipeTitle);
			// 説明
			$target.find('.js-modal_text').text(recipeData.recipeDescription);
			// リンク
			$target.find('.js-modal_link').attr('href', recipeData.recipeUrl);
			// 材料
			const $material = $target.find('.js-modal_material');
			for (var i = 0; i < recipeData.recipeMaterial.length; i++) {
				const insertHtml = `
					<tr><td>${recipeData.recipeMaterial[i]}</td></tr>
				`;
				$material.append(insertHtml);
			}
		}
	};

	/**
	 * モーダル
	 *
	 */
	class Modal {
		constructor (options) {
			this.$modal = options.$modal;
			this.$modalRecipe = options.$modalRecipe;
			this.$modalMenu = options.$modalMenu;
		}
		/**
		 * モーダル表示
		 *
		 * @param {string} target 'recipe' or 'menu'
		 * @return {void}
		*/
		show (target) {
			if (target === 'recipe') this.$modalRecipe.addClass(ACTIVE_CLASS);
			if (target === 'menu') this.$modalMenu.toggleClass(ACTIVE_CLASS, !this.$modalMenu.hasClass(ACTIVE_CLASS));
			this.$modal.addClass(ACTIVE_CLASS);
		}
		/**
		 * モーダル非表示
		 *
		 * @param {string} target 'recipe' or 'menu'
		 * @return {void}
		*/
		hide (target) {
			if (target === 'recipe') this.$modalRecipe.removeClass(ACTIVE_CLASS);
			if (target === 'menu') this.$modalMenu.removeClass(ACTIVE_CLASS);
			this.$modal.removeClass(ACTIVE_CLASS);
		}
	};

	// entry
	const rakutenRecepiAPI = new RakutenRecepiAPI({
		imageClassName: "js-recipe_image",
		timeClassName: "js-recipe_time",
		priceClassName: "js-recipe_price",
		titleClassName: "js-recipe_title",
	});
	const modal = new Modal({
		$modal: $('.js-modal'),
		$modalRecipe: $('.js-modal_recipe'),
		$modalMenu: $('.js-modal_menu'),
	});

	rakutenRecepiAPI.init();

	$(document)
	// レシピ更新ボタン
	.on('click', '.js-recipe_update_button', (e) => {
		// ダブルクリック回避
		$(e.target).css('pointer-events',　'none');

		const $target = $(e.target).closest('.js-recipe');
		rakutenRecepiAPI.updateRandomLecipe({
			dateNumber: $target.attr('data-date-num'),
		});

		// 短時間に複数回通信するとエラーとなるので少し時間を空ける
		setTimeout(() => {
			 // ダブルクリック回避のためのスタイルを削除
			$(e.target).css('pointer-events',　'inherit');
		}, 1000);
	})
	// レシピボタン
	.on('click', '.js-modal_recipe_button', (e) => {
		modal.show('recipe');
		rakutenRecepiAPI.updateModalContents({
			$currentTarget: $(e.target),
			recipeClassName: 'js-recipe',
		});
	})
	// メニューボタン
	.on('click', '.js-modal_menu_button', (e) => {
		modal.show('menu');
	})
	// レシピクローズボタン
	.on('click', '.js-modal_recipe_close', (e) => {
		modal.hide('recipe');
	})
	// メニュークローズボタン
	.on('click', '.js-modal_menu_close', (e) => {
		modal.hide('menu');
	});
});
